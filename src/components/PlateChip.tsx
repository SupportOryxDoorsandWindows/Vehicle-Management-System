import { splitPlate } from '../lib/format';

/** A plate drawn like the real one: the code in a dark box, then the number. */
export function PlateChip({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const { code, number } = splitPlate(plate);
  const text = { sm: 'text-xs', md: 'text-[12.5px]', lg: 'text-[13px]' }[size];
  const pad = size === 'lg' ? 'py-[5px]' : 'py-1';
  return (
    <span
      className={`inline-flex flex-none border-[1.5px] border-oryx-ink rounded overflow-hidden font-mono font-semibold leading-none whitespace-nowrap ${text}`}
    >
      <span className="sr-only">{plate}</span>
      {code && (
        <span aria-hidden="true" className={`${pad} px-[5px] bg-oryx-ink text-white`}>
          {code}
        </span>
      )}
      <span aria-hidden="true" className={`${pad} px-[7px] text-oryx-ink`}>
        {number}
      </span>
    </span>
  );
}
