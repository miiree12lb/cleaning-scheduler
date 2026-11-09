import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import "../css/settings.css";

const UPDATED = "9 November 2026";
const CONTACT = "mireia.lopez.bruch@gmail.com";

export default function Privacy() {
    return (
        <div className="account-page privacy-page">
            <Link to="/" className="back-link account-back">
                <ArrowLeft size={16} aria-hidden="true" /> Back
            </Link>

            <h1>Privacy</h1>
            <p className="section-hint">Last updated: {UPDATED}</p>

            <section className="settings-section">
                <h2>Who runs this app</h2>
                <p>
                    This app is a free, non-commercial project run by Mireia Lopez Bruch, Rotterdam, the Netherlands. I
                    decide what data the app stores and why, so I'm responsible for it (the "controller" under the
                    GDPR). Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
                </p>
            </section>

            <section className="settings-section">
                <h2>What the app stores</h2>
                <ul>
                    <li>
                        <strong>Your account:</strong> your name and email address. If you log in with Google, also
                        your Google account id. If you use a password, only a secure hash of it, never the password
                        itself.
                    </li>
                    <li>
                        <strong>Your houses:</strong> which houses you're in and your role, the tasks and who they
                        were assigned to, which tasks you marked as done, the rules, whether you use opt-in sections
                        (like a dishwasher).
                    </li>
                    <li>
                        <strong>Login sessions:</strong> a cookie that keeps you logged in for up to 30 days. Only
                        a secure hash of it is stored on the server.
                    </li>
                    <li>
                        <strong>Technical data:</strong> your IP address is used for a short time to limit login
                        attempts and protect the app against abuse. Cloudflare, which hosts the app, may keep short
                        technical logs.
                    </li>
                </ul>
                <p>
                    The app has no ads, no analytics and no tracking. Your data is never sold or used for anything
                    else.
                </p>
            </section>

            <section className="settings-section">
                <h2>Why, and on what basis</h2>
                <p>
                    The data is needed to provide what you signed up for: sharing chores, and rules
                    with the people in your house (GDPR article 6(1)(b)). The IP-based protection against abuse is
                    based on a legitimate interest in keeping the app and its users safe (article 6(1)(f)).
                </p>
            </section>

            <section className="settings-section">
                <h2>Who can see it</h2>
                <p>
                    The other members of a house see your name and what you do in that house, like the tasks you
                    marked as done. They don't see your email address. People outside your houses see nothing.
                </p>
                <p>Two companies process data on my behalf:</p>
                <ul>
                    <li>
                        <strong>Cloudflare</strong> hosts the app and its database.
                    </li>
                    <li>
                        <strong>Google</strong> handles the login, only if you choose "Continue with Google".
                    </li>
                </ul>
                <p>
                    Both are US companies, so data may be processed outside the EU. Both take part in the EU-US Data
                    Privacy Framework, which the European Commission considers to give adequate protection.
                </p>
            </section>

            <section className="settings-section">
                <h2>How long it's kept</h2>
                <ul>
                    <li>Your account is kept until you delete it, from your Account page.</li>
                    <li>Login sessions end after 30 days, or when you log out.</li>
                    <li>
                        When you delete your account, your account details are removed. Things you did in a house
                        (like tasks marked as done) stay in that house's history, shown as "Former member" instead
                        of your name.
                    </li>
                    <li>When a house is deleted, everything in it is deleted.</li>
                </ul>
            </section>

            <section className="settings-section">
                <h2>Cookies</h2>
                <p>
                    The app only uses cookies it needs to work: one to keep you logged in, and a short-lived one
                    during Google login. Your light or dark theme choice is saved in your browser only. Because these
                    are all strictly necessary, the app doesn't ask for cookie consent.
                </p>
            </section>

            <section className="settings-section">
                <h2>Your rights</h2>
                <p>
                    You can ask for a copy of your data, ask me to correct or delete it, or object to how it's used.
                    Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and I'll answer within a month. You can also
                    delete your account yourself at any time.
                </p>
                <p>
                    If you're not happy with how I handle your data, you can complain to the Dutch data protection
                    authority, the{" "}
                    <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer">
                        Autoriteit Persoonsgegevens
                    </a>
                    , or to the authority in your own country.
                </p>
            </section>

            <section className="settings-section">
                <h2>Age</h2>
                <p>The app is meant for people aged 16 and over.</p>
            </section>

            <section className="settings-section">
                <h2>Changes</h2>
                <p>
                    If this page changes in an important way, the date at the top changes too, and I'll let users
                    know in the app.
                </p>
            </section>
        </div>
    );
}
