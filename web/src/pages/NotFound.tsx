import { Link } from "react-router";

export default function NotFound() {
    return (
        <>
            <h1>Page not found</h1>
            <div>
                <p>Go back to current's week planning: </p>
                <Link to="/" />
            </div>
        </>
    );
}