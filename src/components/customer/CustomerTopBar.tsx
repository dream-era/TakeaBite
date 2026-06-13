import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getTableDetails } from '@/actions/restaurant';

interface CustomerTopBarProps {
  shopName: string;
}

export function CustomerTopBar({ 
  shopName
}: CustomerTopBarProps) {
  const router = useRouter();
  const params = useParams();
  const tableId = params?.tableId as string | undefined;

  const { data: tableData } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => getTableDetails(tableId as string).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!tableId,
  });

  const table: any = tableData;
  const tableLabel = table ? (table.table_name || `Table ${table.table_number}`) : null;

  return (
    <header className="bg-background dark:bg-on-surface sticky top-0 z-40 w-full">
      <div className="flex justify-between items-center w-full px-container-padding py-4">
        <button onClick={() => router.back()} className="text-on-surface dark:text-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 p-2 -ml-2 flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">arrow_back</span>
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-widest text-on-surface dark:text-surface uppercase truncate max-w-[200px] text-center flex items-center justify-center gap-1.5">
          {shopName}
          <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-50 shrink-0" />
        </h1>
        <div className="w-12 flex justify-end shrink-0">
          {tableLabel && (
            <span className="font-label-md text-primary bg-primary/10 px-2 py-1 rounded-md truncate max-w-[100px]">
              {tableLabel}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
