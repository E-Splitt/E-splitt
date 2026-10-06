import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const UPDATED = 'October 5, 2026';

const Page = ({ title, children }) => (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg, #fff)', color: 'var(--text, #111)' }}>
        <div className="max-w-2xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-75" style={{ color: 'var(--muted)' }}>
                <ArrowLeft size={16} /> Back
            </Link>
            <h1 className="text-3xl font-bold mb-1">{title}</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Last updated: {UPDATED}</p>
            <div className="space-y-6 leading-relaxed">{children}</div>
        </div>
    </div>
);

const Section = ({ title, children }) => (
    <section>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <div className="space-y-2">{children}</div>
    </section>
);

const Contact = () => (
    <Section title="Contact">
        {SUPPORT_EMAIL ? (
            <p>Questions or requests about your data: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        ) : (
            <p>Questions or requests about your data can be sent to the person who invited you to E-Split or to the site operator.</p>
        )}
    </Section>
);

export const PrivacyPolicy = () => (
    <Page title="Privacy Policy">
        <p>E-Split helps groups track shared expenses and settle up. This page explains what we store and why.</p>

        <Section title="What we collect">
            <ul className="list-disc pl-6 space-y-1">
                <li>Account details: your name, email address and password. Passwords are handled by our authentication provider and are never visible to us in readable form.</li>
                <li>Group data you enter: group names, participants (names and optional emails), expenses, settlements, categories, notes, chat messages and activity history.</li>
                <li>Basic technical data your browser sends to our hosting provider (such as IP address) as part of normal web requests.</li>
            </ul>
        </Section>

        <Section title="How we use it">
            <p>Only to run the app: sign you in, show your groups to you and the people you invite, calculate who owes whom, and send account emails such as password resets. We do not sell your data and we do not show ads.</p>
        </Section>

        <Section title="Who can see your data">
            <p>Members of a group can see that group's expenses and participants. People who are not members cannot. Group admins can manage members of their group.</p>
        </Section>

        <Section title="Service providers">
            <ul className="list-disc pl-6 space-y-1">
                <li>Supabase: database and authentication.</li>
                <li>Netlify: website hosting.</li>
                <li>Google Fonts: loads the fonts used by the site.</li>
            </ul>
        </Section>

        <Section title="Storage on your device">
            <p>The app stores a sign-in session and cached app files on your device so it can stay signed in and work faster, including offline.</p>
        </Section>

        <Section title="Your choices">
            <p>You can edit or delete expenses and groups you own at any time. To have your account and data deleted, contact us using the details below.</p>
        </Section>

        <Contact />
    </Page>
);

export const TermsOfService = () => (
    <Page title="Terms of Service">
        <p>By creating an account or using E-Split you agree to these terms.</p>

        <Section title="The service">
            <p>E-Split is a tool for recording shared expenses and calculating who owes whom. It does not move money. Any payments happen outside the app, between you and the other people in your group.</p>
        </Section>

        <Section title="Your account">
            <p>You are responsible for keeping your password safe and for what happens under your account. Provide accurate information and do not use the service for anything unlawful.</p>
        </Section>

        <Section title="Your content">
            <p>You own the data you enter. You allow us to store and display it to the members of your groups so the service can work. Only add information about other people that you are entitled to share with your group.</p>
        </Section>

        <Section title="Accuracy">
            <p>Balances are calculated from what group members enter. Check amounts before settling up; we are not responsible for errors in the data entered or for disputes between group members.</p>
        </Section>

        <Section title="Availability and liability">
            <p>The service is provided "as is" without warranties. We may change or discontinue features, and to the extent permitted by law we are not liable for indirect or consequential losses arising from use of the service.</p>
        </Section>

        <Section title="Changes">
            <p>We may update these terms. Continued use after an update means you accept the new terms.</p>
        </Section>

        <Contact />
    </Page>
);
