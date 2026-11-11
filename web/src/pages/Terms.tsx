import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import "../css/settings.css";

const UPDATED = "9 November 2026";
const CONTACT = "mireia.lopez.bruch@gmail.com";

export default function Terms() {
    return (
        <div className="account-page privacy-page">
            <Link to="/" className="back-link account-back">
                <ArrowLeft size={16} aria-hidden="true" /> Back
            </Link>

            <h1>Terms of use</h1>
            <p className="section-hint">Last updated: {UPDATED}</p>

            <section className="settings-section">
                <h2>About this app</h2>
                <p>
                    This app helps people who share a house split chores and
                    keep house rules. It's a free, non-commercial project run by
                    Mireia Lopez Bruch in Rotterdam, the Netherlands. By
                    creating an account or using the app, you agree to these
                    terms. How your data is handled is described in the{" "}
                    <Link to="/privacy">privacy policy</Link>.
                </p>
            </section>

            <section className="settings-section">
                <h2>Your account</h2>
                <ul>
                    <li>You need to be 16 or older to use the app.</li>
                    <li>
                        Use your real name or a name your housemates recognise.
                    </li>
                    <li>
                        Keep your login safe. If you use a password, don't share
                        it, and tell me if you think someone else has access to
                        your account.
                    </li>
                    <li>
                        You can delete your account at any time from your
                        Account page.
                    </li>
                </ul>
            </section>

            <section className="settings-section">
                <h2>Using the app fairly</h2>
                <p>Please don't:</p>
                <ul>
                    <li>
                        use the app for anything illegal, or to harass or
                        threaten anyone
                    </li>
                    <li>try to access houses or accounts that aren't yours</li>
                    <li>
                        try to break, overload or get around the app's security
                    </li>
                    <li>create accounts or houses automatically, or in bulk</li>
                </ul>
            </section>

            <section className="settings-section">
                <h2>What you write</h2>
                <p>
                    You're responsible for what you add to the app, like task
                    names and rules. The other members of your house can see it.
                    House admins can change or delete the house's tasks and
                    rules, remove members, and delete the house.
                </p>
            </section>

            <section className="settings-section">
                <h2>Removing accounts</h2>
                <p>
                    If an account or house breaks these terms, I may remove it,
                    if possible after letting you know first.
                </p>
            </section>

            <section className="settings-section">
                <h2>No guarantees</h2>
                <p>
                    The app is offered for free, as it is. I do my best to keep
                    it working and your data safe, but I can't promise it will
                    always be available, free of errors, or that data will never
                    be lost. Don't rely on it as the only place you keep
                    something important.
                </p>
                <p>
                    I may change the app, add or remove features, or stop
                    running it. If I stop, I'll try to tell users in advance.
                </p>
                <p>
                    As far as the law allows, I'm not liable for damage caused
                    by using the app or by it not being available. This doesn't
                    limit any rights you have under the law that can't be
                    excluded.
                </p>
            </section>

            <section className="settings-section">
                <h2>Changes to these terms</h2>
                <p>
                    If these terms change in an important way, the date at the
                    top changes, and I'll let users know in the app. If you keep
                    using the app after that, the new terms apply.
                </p>
            </section>

            <section className="settings-section">
                <h2>Law and contact</h2>
                <p>
                    Dutch law applies to these terms. Questions:{" "}
                    <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
                </p>
            </section>
        </div>
    );
}
