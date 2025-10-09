/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*'
      }
    ]
  },
  // Serve static HTML files
  async headers() {
    return [
      {
        source: '/clienthome.html',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html'
          }
        ]
      }
    ]
  }
}