import { Link } from "react-router";
import { SearchX } from "lucide-react";
import "../css/createHouse.css";
import "../css/notFound.css";

type Props = {
    title?: string;
    message?: string;
};

export default function NotFound({
    title = "Page not found",
    message = "This page doesn't exist. The link may be wrong or old.",
}: Props) {
    return (
        <div className="centered-page">
            <div className="card not-found">
                <SearchX
                    size={40}
                    aria-hidden="true"
                    className="not-found-icon"
                />
                <h1>{title}</h1>
                <p className="card-subtitle">{message}</p>
                <Link
                    to="/"
                    state={{ choose: true }}
                    className="primary-button not-found-button"
                >
                    Go to my houses
                </Link>
            </div>
        </div>
    );
}
