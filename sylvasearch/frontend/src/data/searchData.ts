import type { 
  SearchResult, 
  KnowledgePanelData, 
  CategoryTabItem, 
  SidebarNavItem 
} from '../types';

export const INITIAL_RESULTS: SearchResult[] = [
  {
    id: 'unsplash',
    title: 'Nebula Wallpapers | Unsplash',
    url: 'https://unsplash.com/wallpapers/nature/nebula',
    displayUrl: 'https://unsplash.com › wallpapers › nebula',
    snippet: 'Download beautiful nebula wallpapers for your desktop and mobile devices. High resolution, free to use.',
    highlightWords: ['nebula wallpapers'],
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    siteName: 'Unsplash',
    favicon: 'unsplash',
    category: 'Images',
    date: '2 days ago'
  },
  {
    id: 'wallpaper-abyss',
    title: 'Nebula Wallpapers - Wallpaper Abyss',
    url: 'https://wall.alphacoders.com/by_sub_category.php?id=173362',
    displayUrl: 'https://wall.alphacoders.com › nebula',
    snippet: 'A collection of the top 100 Nebula wallpapers and backgrounds available for download in high resolution.',
    highlightWords: ['Nebula wallpapers'],
    thumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80',
    siteName: 'Wallpaper Abyss',
    favicon: 'abyss',
    category: 'Images',
    date: '1 week ago'
  },
  {
    id: 'pinterest',
    title: 'Nebula Wallpaper Ideas',
    url: 'https://in.pinterest.com/search/pins/?q=nebula%20wallpaper',
    displayUrl: 'https://in.pinterest.com › nebula-wallpaper',
    snippet: 'Explore stunning nebula wallpaper ideas for desktop and mobile. Save your favourite pins and get inspired.',
    highlightWords: ['nebula wallpaper ideas'],
    thumbnail: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=600&q=80',
    siteName: 'Pinterest',
    favicon: 'pinterest',
    category: 'Images',
    date: '3 weeks ago'
  },
  {
    id: 'nasa',
    title: 'Nebula Gallery | NASA',
    url: 'https://www.nasa.gov/image-feature/nebula-gallery',
    displayUrl: 'https://www.nasa.gov › image-feature › nebula-gallery',
    snippet: 'Explore breathtaking images of nebulae from the NASA archives. Real cosmic beauty, captured by space telescopes.',
    highlightWords: ['images of nebulae'],
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    siteName: 'NASA',
    favicon: 'nasa',
    category: 'Web',
    date: 'Oct 2026'
  },
  {
    id: '4k-wallpaper',
    title: 'Nebula 4K Wallpapers',
    url: 'https://4kwallpapers.com/space/nebula',
    displayUrl: 'https://4kwallpaper.com › space › nebula',
    snippet: 'Download ultra HD nebula wallpapers for PC, mobile and more. Handpicked collection in 4K and 8K resolution.',
    highlightWords: ['nebula wallpapers'],
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    siteName: '4K Wallpaper',
    favicon: '4k',
    category: 'Images',
    date: 'Sep 2026'
  },
  {
    id: 'space-com',
    title: 'What is a Nebula? Facts, Photos & Formation | Space.com',
    url: 'https://www.space.com/nebula-definition-facts-photos',
    displayUrl: 'https://www.space.com › space-exploration › nebula',
    snippet: 'A nebula is an interstellar cloud of dust, hydrogen, helium and other ionized gases. Learn about how stellar nurseries give birth to stars.',
    highlightWords: ['nebula', 'interstellar cloud'],
    thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80',
    siteName: 'Space.com',
    favicon: 'space',
    category: 'News',
    date: 'Aug 2026'
  }
];

export const KNOWLEDGE_PANEL_DATA: KnowledgePanelData = {
  title: 'Nebula',
  subtitle: 'Cosmic clouds of gas and dust',
  description: 'A nebula is a vast cloud of gas and dust in space, often the birthplace of stars. Nebulae come in many shapes, sizes, and colors, created by powerful cosmic processes such as stellar explosions and ionization.',
  heroImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=900&q=80',
  attributes: [
    {
      icon: 'cube',
      label: 'Composition',
      value: 'Gas (hydrogen, helium), dust'
    },
    {
      icon: 'target',
      label: 'Found in',
      value: 'Galaxies'
    },
    {
      icon: 'star',
      label: 'Notable examples',
      value: 'Orion Nebula, Crab Nebula'
    },
    {
      icon: 'chart',
      label: 'Significance',
      value: 'Star formation, cosmic evolution'
    }
  ],
  relatedImages: [
    {
      url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=500&q=80',
      title: 'NGC 6357 Nebula'
    },
    {
      url: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=500&q=80',
      title: 'Helix Nebula Glow'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
      title: 'Carina Nebula Deep Space'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
      title: 'Cosmic Gas Waves'
    }
  ],
  moreImagesCount: 24
};

export const DEFAULT_SEARCH_TOPICS: string[] = [
  'Python',
  'Artificial Intelligence',
  'Space Exploration',
  'Quantum Computing',
  'Machine Learning',
  'Web Architecture',
];

export const FILTER_CHIPS: string[] = DEFAULT_SEARCH_TOPICS;

export const CATEGORY_TABS: CategoryTabItem[] = [
  { id: 'all', label: 'All', icon: 'all' },
  { id: 'images', label: 'Images', icon: 'image' },
  { id: 'videos', label: 'Videos', icon: 'video' },
  { id: 'news', label: 'News', icon: 'news' },
];

export const SIDEBAR_NAV: SidebarNavItem[] = [
  { id: 'all', label: 'Web Index', icon: 'globe' },
  { id: 'images', label: 'Images', icon: 'image' },
  { id: 'videos', label: 'Videos', icon: 'all' },
  { id: 'news', label: 'News Wire', icon: 'news' },
  { id: 'crawler', label: 'Crawler & Frontier', icon: 'globe' },
];
