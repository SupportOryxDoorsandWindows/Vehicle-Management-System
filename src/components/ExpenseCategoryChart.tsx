import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface CategoryDatum {
  category: string;
  amount: number;
}

export function ExpenseCategoryChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid stroke="#A9A9A9" strokeOpacity={0.3} />
        <XAxis dataKey="category" stroke="#022A3A" />
        <YAxis stroke="#022A3A" />
        <Tooltip formatter={(value: unknown) => `AED ${Number(value).toLocaleString('en-AE')}`} />
        <Bar dataKey="amount" fill="#022A3A" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
