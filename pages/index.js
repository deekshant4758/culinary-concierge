// pages/index.js
export default function Home() { return null; }

export async function getServerSideProps({ req }) {
  const { parse } = require('cookie');
  const { verifyToken } = require('../lib/auth');
  const cookies = parse(req.headers.cookie || '');
  if (cookies.auth_token && verifyToken(cookies.auth_token)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
  return { redirect: { destination: '/login', permanent: false } };
}
