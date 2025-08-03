import { nanoid } from 'nanoid';
import type { NewCategory } from '../schema';

export const seedCategories: NewCategory[] = [
  {
    id: nanoid(),
    name: '傳統節慶',
    slug: 'traditional',
    colorCode: '#DC2626',
    icon: '🎊',
  },
  {
    id: nanoid(),
    name: '浪漫之旅',
    slug: 'romantic',
    colorCode: '#EC4899',
    icon: '💕',
  },
  {
    id: nanoid(),
    name: '藝術文化',
    slug: 'art_culture',
    colorCode: '#7C3AED',
    icon: '🎭',
  },
  {
    id: nanoid(),
    name: '養生樂活',
    slug: 'wellness',
    colorCode: '#10B981',
    icon: '🧘',
  },
  {
    id: nanoid(),
    name: '美食饗宴',
    slug: 'cuisine',
    colorCode: '#F59E0B',
    icon: '🍜',
  },
  {
    id: nanoid(),
    name: '自然生態',
    slug: 'nature',
    colorCode: '#059669',
    icon: '🌿',
  },
  {
    id: nanoid(),
    name: '原民慶典',
    slug: 'indigenous',
    colorCode: '#B91C1C',
    icon: '🪶',
  },
  {
    id: nanoid(),
    name: '客家文化',
    slug: 'hakka',
    colorCode: '#1E40AF',
    icon: '🏮',
  },
];
