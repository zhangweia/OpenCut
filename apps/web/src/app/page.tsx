import { redirect } from "next/navigation";

interface HomeProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // 在 Next.js 15 中需要 await searchParams
  const params = await searchParams;
  
  // 构建查询字符串
  const queryString = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          queryString.append(key, v);
        }
      } else {
        queryString.set(key, value);
      }
    }
  }
  
  const queryStr = queryString.toString();
  const redirectUrl = queryStr ? `/editor?${queryStr}` : "/editor";
  
  redirect(redirectUrl);
}
