import { NextResponse } from 'next/server';

export const GET = async () => {
  const apiKey = process.env.HUME_API_KEY;
  
  if (!apiKey) {
    console.error('HUME_API_KEY is not set');
    return NextResponse.json(
      { error: 'API key not configured' }, 
      { status: 500 }
    );
  }

  try {
    return NextResponse.json({ accessToken: apiKey });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}