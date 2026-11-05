import { Link } from "react-router";

export default function NotFound() {
    return (
        <>
            <h1>Page not found</h1>
            <Link to="/">Go back to main page</Link>
        </>
    );
}
