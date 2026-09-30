import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { captureVisitorEmail, syncEmailCapture } from '../helpers/behaviorTracker';

const SETUP_IMAGE = `${process.env.PUBLIC_URL || ''}/fondosetup.avif`;
const PERKS = ['Promociones', 'Premios', 'Descuentos'];

function asksOnThisPage(pathname) {
    if (pathname.includes('/panel-admin')) return false;
    return pathname === '/' || pathname.startsWith('/carrito');
}

function useEmailAlreadyCaptured(userEmail) {
    const [ready, setReady] = useState(false);
    const [captured, setCaptured] = useState(() => Boolean(userEmail));

    useEffect(() => {
        if (userEmail) {
            setCaptured(true);
            setReady(true);
            return undefined;
        }
        let ignore = false;
        syncEmailCapture().then((isCaptured) => {
            if (ignore) return;
            setCaptured(Boolean(isCaptured));
            setReady(true);
        });
        return () => {
            ignore = true;
        };
    }, [userEmail]);

    return { ready, captured: Boolean(userEmail) || captured };
}

function EmailOfferFields({ email, setEmail, status, onDismiss, compact }) {
    return (
        <>
            <p className="text-xs tracking-widest text-[#373592] mb-2">ZENN ELECTRÓNICOS</p>
            <h2 className={`${compact ? 'text-lg' : 'text-xl'} text-gray-900 font-medium mb-2`}>Dejá tu correo</h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Enterate de ofertas, promociones y novedades.
            </p>
            <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-gray-300 px-3 py-3 text-sm mb-3 bg-white"
            />
            {status && <p className="text-sm text-red-600 mb-3">{status}</p>}
            <div className="flex flex-col gap-2">
                <button type="submit" className="w-full bg-[#373592] text-white px-4 py-3 text-sm font-medium rounded-lg">
                    Quiero recibir novedades
                </button>
                {onDismiss && (
                    <button type="button" onClick={onDismiss} className="w-full px-4 py-3 text-sm text-gray-500">
                        Ahora no
                    </button>
                )}
            </div>
        </>
    );
}

export function ProductEmailOffer() {
    const userEmail = useSelector((state) => state?.user?.user?.email || '');
    const { ready, captured } = useEmailAlreadyCaptured(userEmail);
    const [hidden, setHidden] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setStatus('');
        try {
            await captureVisitorEmail(email.trim(), 'producto');
            setHidden(true);
        } catch (error) {
            setStatus(error.message);
        }
    };

    if (!ready || captured || hidden) return null;

    return (
        <form onSubmit={submit} className="mt-4 bg-gray-50 p-4 rounded-lg">
            <EmailOfferFields email={email} setEmail={setEmail} status={status} compact />
        </form>
    );
}

export default function EmailCaptureModal() {
    const { pathname } = useLocation();
    const userEmail = useSelector((state) => state?.user?.user?.email || '');
    const { ready, captured } = useEmailAlreadyCaptured(userEmail);
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [keyboardInset, setKeyboardInset] = useState(0);

    useEffect(() => {
        if (!ready) return undefined;
        if (captured || !asksOnThisPage(pathname)) {
            setOpen(false);
            return undefined;
        }
        const timer = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(timer);
    }, [pathname, captured, ready]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKey = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);

        const viewport = window.visualViewport;
        const syncInset = () => {
            if (!viewport) return;
            const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            setKeyboardInset(inset > 80 ? Math.round(inset) : 0);
        };
        syncInset();
        viewport?.addEventListener('resize', syncInset);
        viewport?.addEventListener('scroll', syncInset);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
            viewport?.removeEventListener('resize', syncInset);
            viewport?.removeEventListener('scroll', syncInset);
            setKeyboardInset(0);
        };
    }, [open]);

    const submit = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setStatus('');
        setSubmitting(true);
        try {
            await captureVisitorEmail(email.trim(), 'modal');
            setOpen(false);
        } catch (error) {
            setStatus(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open || captured) return null;

    const keyboardOpen = keyboardInset > 0;

    return (
        <div
            className="fixed inset-0 z-[240] overflow-y-auto overscroll-contain bg-black/75"
            style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
                paddingBottom: `max(0.75rem, calc(env(safe-area-inset-bottom) + ${keyboardInset}px))`,
                paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            }}
            onClick={() => setOpen(false)}
        >
            <style>{`
                @media (max-height: 500px) {
                    .email-capture-copy,
                    .email-capture-perks,
                    .email-capture-note { display: none; }
                }
            `}</style>
            <div
                className="flex min-h-full w-full justify-center"
                style={{ alignItems: 'safe center' }}
            >
            <form
                onSubmit={submit}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-capture-title"
                className="my-auto flex w-full min-w-0 max-w-[440px] flex-col overflow-hidden rounded-3xl bg-[#07070c] text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                style={{ maxHeight: 'calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
            >
                {!keyboardOpen && (
                    <div className="relative min-h-0 overflow-hidden bg-black" style={{ flex: '0 1 auto', aspectRatio: '740 / 494' }}>
                        <img
                            src={SETUP_IMAGE}
                            alt=""
                            width="740"
                            height="494"
                            className="absolute inset-0 h-full w-full object-contain object-center"
                        />
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background: 'linear-gradient(to top, #07070c 0%, rgba(7,7,12,0.92) 24%, rgba(7,7,12,0.45) 52%, rgba(7,7,12,0.08) 100%)',
                            }}
                        />
                        <div
                            className="relative z-[1] flex h-full min-w-0 flex-col justify-end px-4 pb-1 pt-14 sm:px-6"
                            style={{ textShadow: '0 2px 14px rgba(0,0,0,0.75)' }}
                        >
                            <p className="text-[11px] font-medium tracking-[0.22em] text-white/80 sm:tracking-[0.28em]">ZENN ELECTRÓNICOS</p>
                            <h2 id="email-capture-title" className="mt-2 font-semibold leading-tight text-white" style={{ fontSize: 'clamp(1.35rem, 5.2vw, 1.9rem)' }}>
                                Escribí tu correo
                            </h2>
                            <p className="email-capture-copy mt-2 text-sm leading-relaxed text-white">
                                Dejalo acá para que te lleguen promociones y participes de premios, descuentos y todo lo que vamos a ir lanzando.
                            </p>
                            <ul className="email-capture-perks mt-3 flex flex-wrap gap-2 pb-2">
                                {PERKS.map((perk) => (
                                    <li key={perk} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Cerrar"
                            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur-sm"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                {keyboardOpen && (
                    <div className="flex min-w-0 items-start justify-between gap-3 px-4 pb-1 pt-4 sm:px-6">
                        <h2 id="email-capture-title" className="min-w-0 text-xl font-semibold leading-tight text-white">Escribí tu correo</h2>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Cerrar"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="shrink-0 bg-[#07070c] px-4 pb-4 pt-3 sm:px-6">
                    <label htmlFor="email-capture-input" className="sr-only">Correo electrónico</label>
                    <input
                        id="email-capture-input"
                        type="email"
                        required
                        inputMode="email"
                        autoComplete="email"
                        enterKeyHint="send"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Escribí tu correo"
                        className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-[#8b8cff] focus:ring-2 focus:ring-[#373592]/50"
                        style={{
                            fontSize: 16,
                            minHeight: 48,
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.16)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                        }}
                    />
                    {status && <p className="mb-3 text-sm text-red-300">{status}</p>}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full whitespace-normal rounded-xl bg-[#373592] px-4 py-3.5 text-center text-sm font-semibold leading-tight text-white transition hover:bg-[#2d2b78] disabled:opacity-70"
                        style={{ minHeight: 48 }}
                    >
                        {submitting ? 'Guardando...' : 'Quiero las promociones'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="mt-1 w-full py-2.5 text-sm text-white/55"
                    >
                        Ahora no
                    </button>
                    <p className="email-capture-note text-center text-[11px] leading-relaxed text-white/35">
                        Es gratis. Te escribimos cuando haya una promoción, un premio o un descuento.
                    </p>
                </div>
            </form>
            </div>
        </div>
    );
}
