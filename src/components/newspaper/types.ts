export interface Article {
    id: string;
    headline: string;
    subhead?: string;
    author?: string;
    category?: string; // e.g., "Technology", "World", "Opinion"
    content: string;
    imageUrl?: string;
    imageCaption?: string;
    size: 'xl' | 'l' | 'm' | 's'; // Controls visual weight
    location: 'main' | 'sidebar-left' | 'sidebar-right' | 'bottom';
}
