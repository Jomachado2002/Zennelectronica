import { toast } from 'react-toastify';

const MAX_TOASTS = 3;
const QUIET_MS = 2500;

let shown = 0;
let resetTimer = null;

function scheduleReset() {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
        shown = 0;
    }, QUIET_MS);
}

/** Como máximo 3 avisos por ráfaga. El resto se descarta hasta que la persona deja de tocar. */
export function toastCart(type, message) {
    if (shown >= MAX_TOASTS) {
        scheduleReset();
        return;
    }
    shown += 1;
    const notify = toast[type] || toast.success;
    notify(message, { toastId: `cart-notice-${shown}` });
    scheduleReset();
}
