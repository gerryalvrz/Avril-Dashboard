import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const url = process.env.NEXT_PUBLIC_APP_URL || origin;

  const body = {
    name: 'Avril Dashboard',
    description: 'Control plane for Avril multi-agent operations.',
    url,
    version: '0.3.0',
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
