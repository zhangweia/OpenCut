"use client";

import { useProjectStore } from "@/stores/project-store";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function EditorIndexContent() {
  const { createNewProject } = useProjectStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const createAndRedirect = async () => {
      try {
        // 创建新项目
        const projectId = await createNewProject("新项目");
        
        // 保留查询参数
        const queryString = searchParams.toString();
        const redirectUrl = queryString 
          ? `/editor/${projectId}?${queryString}`
          : `/editor/${projectId}`;
        
        // 重定向到编辑器页面
        router.replace(redirectUrl);
      } catch (error) {
        console.error("创建项目失败:", error);
        // 如果创建失败，重定向到项目列表页
        const queryString = searchParams.toString();
        const fallbackUrl = queryString 
          ? `/projects?${queryString}`
          : "/projects";
        router.replace(fallbackUrl);
      }
    };

    createAndRedirect();
  }, [createNewProject, router, searchParams]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在创建新项目...</p>
      </div>
    </div>
  );
}

export default function EditorIndex() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在加载...</p>
          </div>
        </div>
      }
    >
      <EditorIndexContent />
    </Suspense>
  );
}
