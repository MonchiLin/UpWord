import { motion, type Variants } from 'framer-motion';
import { toArticleSlug } from "../../../server/lib/slug";

export interface ArticleItemProps {
    title: string;
    index: number;
    isRead?: boolean;
    date: string;
    generationMode?: 'rss' | 'impression';
}

export const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    },
    exit: { opacity: 0, height: 0 }
};

export default function ArticleItemReact({ title, index, isRead = false, date }: ArticleItemProps) {
    const slug = toArticleSlug(title);
    const href = `/${date}/${slug}`;

    return (
        <motion.article
            variants={itemVariants}
            className="group relative border-b border-stone-200/60 last:border-0 hover:bg-stone-50/50 -mx-4 px-4 transition-colors duration-300 cursor-pointer"
            whileHover={{
                x: 4,
                backgroundColor: "rgba(250, 250, 249, 0.8)", // stone-50/80
                transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.995 }}
        >
            <a href={href} className="flex items-baseline py-5 w-full gap-6">
                {/* Number / Checkmark */}
                <span className={`inline-flex shrink-0 transition-colors duration-300 select-none w-8 justify-end ${isRead
                    ? 'text-amber-600/60 translate-y-[2px]'
                    : 'font-display italic text-2xl text-stone-300/80 group-hover:text-stone-500 transition-all'
                    }`}>
                    {isRead ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        String(index + 1).padStart(2, '0')
                    )}
                </span>

                {/* Title */}
                <h3 className={`flex-1 font-serif text-xl leading-relaxed transition-colors pr-4 ${isRead ? 'text-stone-400 decoration-stone-300 line-through decoration-1' : 'text-slate-900 group-hover:text-amber-900'
                    }`}>
                    {title}
                </h3>

                {/* Arrow Icon (Subtle) */}
                <motion.div
                    className="inline-flex items-center shrink-0 text-stone-300 self-center"
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </motion.div>
            </a>
        </motion.article>
    );
}
