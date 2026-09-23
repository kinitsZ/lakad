import { notFound } from "next/navigation";
import { Expenses } from "@/components/expenses";
import { getExpenseData, getTripContext } from "@/db/queries";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Expenses · Lakad" };

export default async function ExpensesPage({ params }: PageProps<"/trip/[slug]/expenses">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const data = await getExpenseData(
    context.trip.id,
    context.members.map((m) => m.id),
  );

  return (
    <PageTransition>
      <Expenses
        slug={slug}
        tripId={context.trip.id}
        members={context.members}
        currentMemberId={context.currentMember.id}
        expenses={data.expenses}
        balances={data.balances}
        totalCents={data.totalCents}
        transferCount={data.transfers.length}
      />
    </PageTransition>
  );
}
