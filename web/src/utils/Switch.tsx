import "../css/switch.css";

type Props = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    disabled?: boolean;
};

export default function Switch({
    checked,
    onChange,
    label,
    disabled = false,
}: Props) {
    return (
        <label className="switch">
            <input
                type="checkbox"
                role="switch"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
            </span>
            <span className="switch-label">{label}</span>
        </label>
    );
}
