import { MetadataRoute } from 'next';
import { navigationConfig, type NavItem } from '@/lib/navigation-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://salesview.id';
  
  const appsMenus = navigationConfig.filter(
    (nav) => nav.children && nav.name !== 'Reports' && nav.name !== 'Master Data' && nav.name !== 'Dashboard'
  );

  const getSlug = (menu: NavItem) => {
    const firstChild = menu.children?.find((c) => c.url);
    return firstChild ? firstChild.url.split('/').filter(Boolean)[0] || 'app' : 'app';
  };

  const appUrlsId = appsMenus.map((menu) => ({
    url: `${baseUrl}/id/apps/${getSlug(menu)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const appUrlsEn = appsMenus.map((menu) => ({
    url: `${baseUrl}/en/apps/${getSlug(menu)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${baseUrl}/id`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/id/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/en/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    ...appUrlsId,
    ...appUrlsEn,
  ];
}
