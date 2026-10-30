import { SESSION_CAPACITIES, type SessionCapacity } from "./session-capacity-options";
export function SessionCapacityControl({ value, onChange, unit = "từ", labelledBy }: { value: SessionCapacity; onChange: (value: SessionCapacity) => void; unit?: string; labelledBy: string }) {
  return <div className="study-setup-amounts" role="group" aria-labelledby={labelledBy}>
    {SESSION_CAPACITIES.map(amount => <button key={amount} className={`study-setup-amount${value === amount ? " is-selected" : ""}`} type="button" aria-label={`${amount} ${unit}`} aria-pressed={value === amount} onClick={() => onChange(amount)}>
      {value === amount ? <span className="study-setup-selected-check"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span> : null}
      <strong>{amount}</strong><span>{unit}</span>
    </button>)}
  </div>;
}
