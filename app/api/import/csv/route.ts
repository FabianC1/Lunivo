import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/route';
import Transaction, { ITransaction } from '@/models/Transaction';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

interface CSVRow {
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  note?: string;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: string[];
  totalRows: number;
}

// Helper to parse CSV
function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have header row and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.every(v => !v)) continue; // Skip empty rows

    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row);
  }

  return rows;
}

// Helper to detect duplicates
async function findDuplicates(
  userId: string,
  transactions: Partial<ITransaction>[]
): Promise<Set<number>> {
  const duplicateIndices = new Set<number>();

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    const existing = await Transaction.findOne({
      userId,
      date: txn.date,
      amount: txn.amount,
      description: txn.description,
      kind: txn.kind,
      imported: true,
    });

    if (existing) {
      duplicateIndices.add(i);
    }
  }

  return duplicateIndices;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check CSV import limit for free users
    const { maxCSVImportsPerMonth, maxCSVRowsPerImport } = user.planSlug === 'free' 
      ? { maxCSVImportsPerMonth: 1, maxCSVRowsPerImport: 50 }
      : { maxCSVImportsPerMonth: null, maxCSVRowsPerImport: null };

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvContent = await file.text();
    const rows = parseCSV(csvContent);

    if (maxCSVRowsPerImport && rows.length > maxCSVRowsPerImport) {
      return NextResponse.json(
        { error: `Free plan limited to ${maxCSVRowsPerImport} rows per import` },
        { status: 400 }
      );
    }

    // Check monthly import count for free users
    if (maxCSVImportsPerMonth) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const importCount = await Transaction.countDocuments({
        userId: user._id,
        imported: true,
        source: 'csv-import',
        createdAt: { $gte: thisMonth },
      });

      if (importCount >= maxCSVImportsPerMonth) {
        return NextResponse.json(
          { error: 'Monthly CSV import limit reached. Upgrade to import more.' },
          { status: 403 }
        );
      }
    }

    // Transform CSV rows to transactions
    const transactions: Partial<ITransaction>[] = rows.map(row => ({
      userId: user._id,
      date: new Date(row.date),
      description: row.description,
      amount: parseFloat(row.amount),
      kind: row.type === 'income' ? 'income' : 'expense',
      category: row.category || 'Other',
      source: 'csv-import' as const,
      imported: true,
      csvSource: file.name,
    }));

    // Find duplicates
    const duplicateIndices = await findDuplicates(user._id.toString(), transactions);
    const validTransactions = transactions.filter((_, i) => !duplicateIndices.has(i));

    // Insert valid transactions
    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < validTransactions.length; i++) {
      try {
        await Transaction.create(validTransactions[i]);
        importedCount++;
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    const result: ImportResult = {
      imported: importedCount,
      duplicates: duplicateIndices.size,
      errors,
      totalRows: rows.length,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[CSV Import Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process CSV' },
      { status: 400 }
    );
  }
}
