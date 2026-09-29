import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { captureVisitorEmail, hasVisitorEmail, syncEmailCapture } from '../helpers/behaviorTracker';

function asksOnThisPage(pathname) {
    if (pathname.includes('/panel-admin')) return false;
    return pathname === '/' || pathname.startsWith('/producto') || pathname.startsWith('/carrito');
}

export default function EmailCaptureModal() {
    const { pathname } = useLocation();
    const userEmail = useSelector((state) => state?.user?.user?.email || '');
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [checked, setChecked] = useState(() => Boolean(userEmail) || hasVisitorEmail());

    useEffect(() => {
        if (userEmail || hasVisitorEmail()) {
            setChecked(true);
            return undefined;
        }
        let ignore = false;
        syncEmailCapture().finally(() => {
            if (!ignore) setChecked(true);
        });
        return () => {
            ignore = true;
        };
    }, [userEmail]);

    useEffect(() => {
        if (!checked) return undefined;
        if (userEmail || hasVisitorEmail() || !asksOnThisPage(pathname)) {
            setOpen(false);
            return undefined;
        }
        const timer = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(timer);
    }, [pathname, userEmail, checked]);

    const submit = async (event) => {
        event.preventDefault();
        setStatus('');
        try {
            await captureVisitorEmail(email.trim(), 'modal');
            setOpen(false);
        } catch (error) {
            setStatus(error.message);
        }
    };

    if (!open || userEmail || hasVisitorEmail()) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <form onSubmit={submit} className="w-full max-w-md bg-white p-6 border border-gray-200">
                <p className="text-xs tracking-widest text-[#373592] mb-2">ZENN ELECTRÓNICOS</p>
                <h2 className="text-xl text-gray-900 font-medium mb-2">Dejá tu correo</h2>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Enterate de ofertas, promociones y novedades.
                </p>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full border border-gray-300 px-3 py-3 text-sm mb-3"
                />
                {status && <p className="text-sm text-red-600 mb-3">{status}</p>}
                <div className="flex gap-3">
                    <button type="submit" className="bg-[#373592] text-white px-4 py-3 text-sm font-medium">
                        Quiero recibir novedades
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="px-4 py-3 text-sm text-gray-500">
                        Ahora no
                    </button>
                </div>
            </form>
        </div>
    );
}
