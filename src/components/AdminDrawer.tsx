import { useState } from 'react';
import { Drawer, ConfigProvider } from 'antd';
import AdminDayPanel from './AdminDayPanel';

export default function AdminDrawer({ date }: { date: string }) {
    const [open, setOpen] = useState(false);

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontFamily: 'inherit', // Inherit Inter/Serif from app
                }
            }}
        >
            <>
                <button
                    onClick={() => setOpen(true)}
                    className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400 hover:text-slate-900 transition-colors cursor-pointer"
                >
                    MANAGE
                </button>
                <Drawer
                    title={<span className="font-serif italic text-stone-600">Admin Controls</span>}
                    placement="right"
                    onClose={() => setOpen(false)}
                    open={open}
                    width={500}
                    styles={{
                        header: { borderBottom: '1px solid #e7e5e4' }, // stone-200
                        body: { padding: 0 }
                    }}
                >
                    <div className="p-6">
                        <AdminDayPanel date={date} isDrawerMode={true} />
                    </div>
                </Drawer>
            </>
        </ConfigProvider>
    );
}
