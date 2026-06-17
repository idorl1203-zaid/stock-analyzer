import { NextRequest, NextResponse } from 'next/server';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const searchQuery = `${query} stock news latest 2024 2025`;
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=6&freshness=pw`,
      {
        headers: {
          'X-Subscription-Token': BRAVE_API_KEY || '',
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Brave API error:', err);
      return NextResponse.json({ news: [] });
    }

    const data = await response.json();
    const results = data.web?.results || [];

    const news = results.slice(0, 6).map((item: {
      title: string;
      url: string;
      description?: string;
      page_age?: string;
    }) => ({
      title: item.title,
      url: item.url,
      description: item.description || '',
      age: item.page_age || 'Recent',
    }));

    return NextResponse.json({ news });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ news: [] });
  }
}
