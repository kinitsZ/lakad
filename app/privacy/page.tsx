import Link from "next/link";
import type { ReactNode } from "react";
import { BrandBar } from "@/components/brand-bar";

export const metadata = { title: "Privacy policy · Lakad" };

const CONTACT = "lakad.app@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] lg:max-w-[720px] px-[22px] lg:px-6 py-8 lg:py-12">
        <Link
          href="/"
          className="font-medium text-[13px] text-ink2 hover:text-ink mb-6 inline-block"
        >
          ← Back
        </Link>
        <h1 className="font-display font-semibold text-[30px] lg:text-[38px] tracking-[-0.025em] mb-2">
          Privacy policy
        </h1>
        <p className="text-[13px] text-ink2 mb-8">Last updated 25 September 2026</p>

        <div className="flex flex-col gap-7 text-[14px] lg:text-[15px] leading-[1.65] text-ink2">
          <p>
            Lakad helps a group of friends plan a trip together. This page explains what we store,
            why, who can see it, and how to have it removed. If anything here is unclear, email{" "}
            <Mail />.
          </p>

          <Section title="What we collect">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <b className="text-ink">The name you give</b> when you create or join a trip.
              </li>
              <li>
                <b className="text-ink">Your email address, only if you add one</b> for reminders.
                It&rsquo;s optional and you can remove it at any time.
              </li>
              <li>
                <b className="text-ink">What you add to a trip:</b> the days you&rsquo;re free,
                destination votes and suggestions, itinerary activities, expenses, and payments you
                mark as made.
              </li>
              <li>
                <b className="text-ink">A sign-in cookie</b> holding a random code that keeps this
                browser signed in to your trips. We don&rsquo;t use advertising or tracking cookies.
                Your light/dark theme choice is saved in your own browser only.
              </li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>
              Only to run your trips: showing the group&rsquo;s plans, working out balances and who
              should pay whom, and — if you&rsquo;ve added an email and haven&rsquo;t paused
              reminders — sending voting reminders, the calendar invite when dates lock, and payment
              reminders. We don&rsquo;t sell your data, use it for advertising, or send marketing
              email.
            </p>
          </Section>

          <Section title="Who can see it">
            <p>
              People on the same trip see your name and what you add to that trip. They never see
              your email address. A trip can only be joined with its invite link, which the
              organiser can reset.
            </p>
          </Section>

          <Section title="Services we rely on">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <b className="text-ink">Vercel</b> hosts the website.
              </li>
              <li>
                <b className="text-ink">Supabase</b> hosts the database where trips are stored.
              </li>
              <li>
                <b className="text-ink">Google (Gmail)</b> delivers reminder emails, sent from{" "}
                {CONTACT}.
              </li>
            </ul>
            <p className="mt-3">They process data only to provide these services to us.</p>
          </Section>

          <Section title="Keeping and deleting your data" id="delete">
            <p>
              Trip data is kept while the trip exists, so the group can look back on its plans and
              balances. You can remove your email yourself at any time from a trip&rsquo;s Updates
              page. To have your data deleted — your name, email and anything you added — email{" "}
              <Mail /> with the trip&rsquo;s name and the name you used, and we&rsquo;ll remove it
              within 30 days. Expenses other people logged may keep an anonymous entry so the
              group&rsquo;s balances still add up.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we change how we handle data, we&rsquo;ll update this page and the date at the top.
            </p>
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display font-semibold text-[19px] lg:text-[21px] text-ink tracking-[-0.015em] mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">
      {CONTACT}
    </a>
  );
}
