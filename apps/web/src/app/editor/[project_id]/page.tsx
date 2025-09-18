"use client";

import { EditorHeader } from "@/components/editor/editor-header";
import { MediaPanel } from "@/components/editor/media-panel";
import { Onboarding } from "@/components/editor/onboarding";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { Timeline } from "@/components/editor/timeline";
import { EditorProvider } from "@/components/providers/editor-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePanelStore } from "@/stores/panel-store";
import { useProjectStore } from "@/stores/project-store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function EditorContent() {
  const {
    toolsPanel,
    previewPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPreviewPanel,
    setMainContent,
    setTimeline,
    propertiesPanel,
    setPropertiesPanel,
    activePreset,
    resetCounter,
  } = usePanelStore();

  const {
    activeProject,
    loadProject,
    createNewProject,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  } = useProjectStore();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.project_id as string;
  const handledProjectIds = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef<boolean>(false);

  usePlaybackControls();

  // 处理从 nd-super-agent 传递过来的参数
  useEffect(() => {
    const handleExternalParams = async () => {
      console.log('🔍 开始检查外部参数...');
      
      // 获取URL参数
      const token = searchParams.get('token');
      const userId = searchParams.get('user_id');
      const tenantId = searchParams.get('tenant_id');
      const materialIds = searchParams.get('material_ids');
      
      // 从环境变量获取 API 基础 URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_ND_SUPER_AGENT_API_URL;

      console.log('📋 外部参数检查:', {
        hasToken: !!token,
        hasUserId: !!userId,
        hasTenantId: !!tenantId,
        hasMaterialIds: !!materialIds,
        hasApiBaseUrl: !!apiBaseUrl,
        materialIds
      });


      // 如果有外部参数，处理素材加载
      if (token && materialIds && apiBaseUrl) {
        console.log('检测到外部参数，开始加载素材:', {
          token: token.substring(0, 10) + '...',
          userId,
          tenantId,
          materialIds,
          apiBaseUrl: apiBaseUrl?.substring(0, 30) + '...'
        });

        try {
          // 解析素材ID列表
          const ids = materialIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          
          if (ids.length > 0) {
            console.log('🔗 调用素材接口:', { ids, apiUrl: `${apiBaseUrl}/gallery/batch-query` });

            // 调用 nd-super-agent 的素材接口
            const response = await fetch(`${apiBaseUrl}/gallery/batch-query`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(tenantId && { 'X-Tenant-ID': tenantId }),
                ...(userId && { 'X-User-ID': userId })
              },
              body: JSON.stringify({ ids })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('✅ 素材加载成功:', {
                找到数量: result.data?.found_count || 0,
                请求数量: result.data?.requested_count || 0
              });
              
              if (result.success && result.data && result.data.items) {
                console.log('📋 获取到素材:', result.data.items.map(item => ({
                  id: item.id,
                  name: item.name || item.title,
                  type: item.type
                })));
                
                // TODO: 将素材添加到 OpenCut 的媒体存储中
                // 可能需要调用 useMediaStore 或相关的存储管理
              }
            } else {
              console.error('❌ 素材加载失败:', response.status, response.statusText);
            }
          } else {
            console.warn('⚠️ 没有有效的素材ID');
          }
        } catch (error) {
          console.error('💥 素材加载失败:', error.message);
        }
      }
    };

    // 延迟执行，确保组件已经初始化
    const timer = setTimeout(handleExternalParams, 1000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    let isCancelled = false;

    const initProject = async () => {
      if (!projectId) {
        return;
      }

      // Prevent duplicate initialization
      if (isInitializingRef.current) {
        return;
      }

      // Check if project is already loaded
      if (activeProject?.id === projectId) {
        return;
      }

      // Check global invalid tracking first (most important for preventing duplicates)
      if (isInvalidProjectId(projectId)) {
        return;
      }

      // Check if we've already handled this project ID locally
      if (handledProjectIds.current.has(projectId)) {
        return;
      }

      // Mark as initializing to prevent race conditions
      isInitializingRef.current = true;
      handledProjectIds.current.add(projectId);

      try {
        await loadProject(projectId);

        // Check if component was unmounted during async operation
        if (isCancelled) {
          return;
        }

        // Project loaded successfully
        isInitializingRef.current = false;
      } catch (error) {
        // Check if component was unmounted during async operation
        if (isCancelled) {
          return;
        }

        // More specific error handling - only create new project for actual "not found" errors
        const isProjectNotFound =
          error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("Project not found"));

        if (isProjectNotFound) {
          // Mark this project ID as invalid globally BEFORE creating project
          markProjectIdAsInvalid(projectId);

          try {
            const newProjectId = await createNewProject("Untitled Project");

            // Check again if component was unmounted
            if (isCancelled) {
              return;
            }

            router.replace(`/editor/${newProjectId}`);
          } catch (createError) {
            console.error("Failed to create new project:", createError);
          }
        } else {
          // For other errors (storage issues, corruption, etc.), don't create new project
          console.error(
            "Project loading failed with recoverable error:",
            error
          );
          // Remove from handled set so user can retry
          handledProjectIds.current.delete(projectId);
        }

        isInitializingRef.current = false;
      }
    };

    initProject();

    // Cleanup function to cancel async operations
    return () => {
      isCancelled = true;
      isInitializingRef.current = false;
    };
  }, [
    projectId,
    loadProject,
    createNewProject,
    router,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  ]);

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <EditorHeader />
        <div className="flex-1 min-h-0 min-w-0">
          {activePreset === "media" ? (
            <ResizablePanelGroup
              key={`media-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={toolsPanel}
                minSize={15}
                maxSize={40}
                onResize={setToolsPanel}
                className="min-w-0 rounded-sm"
              >
                <MediaPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={100 - toolsPanel}
                minSize={60}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={previewPanel}
                        minSize={30}
                        onResize={setPreviewPanel}
                        className="min-w-0 min-h-0 flex-1"
                      >
                        <PreviewPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={propertiesPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setPropertiesPanel}
                        className="min-w-0"
                      >
                        <PropertiesPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : activePreset === "inspector" ? (
            <ResizablePanelGroup
              key={`inspector-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={100 - propertiesPanel}
                minSize={30}
                onResize={(size) => setPropertiesPanel(100 - size)}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={toolsPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setToolsPanel}
                        className="min-w-0 rounded-sm"
                      >
                        <MediaPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={previewPanel}
                        minSize={30}
                        onResize={setPreviewPanel}
                        className="min-w-0 min-h-0 flex-1"
                      >
                        <PreviewPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={propertiesPanel}
                minSize={15}
                maxSize={40}
                onResize={setPropertiesPanel}
                className="min-w-0 min-h-0"
              >
                <PropertiesPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : activePreset === "vertical-preview" ? (
            <ResizablePanelGroup
              key={`vertical-preview-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={100 - previewPanel}
                minSize={30}
                onResize={(size) => setPreviewPanel(100 - size)}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={toolsPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setToolsPanel}
                        className="min-w-0 rounded-sm"
                      >
                        <MediaPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={propertiesPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setPropertiesPanel}
                        className="min-w-0"
                      >
                        <PropertiesPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={previewPanel}
                minSize={30}
                onResize={setPreviewPanel}
                className="min-w-0 min-h-0"
              >
                <PreviewPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ResizablePanelGroup
              key={`default-${activePreset}-${resetCounter}`}
              direction="vertical"
              className="h-full w-full gap-[0.18rem]"
            >
              <ResizablePanel
                defaultSize={mainContent}
                minSize={30}
                maxSize={85}
                onResize={setMainContent}
                className="min-h-0"
              >
                {/* Main content area */}
                <ResizablePanelGroup
                  direction="horizontal"
                  className="h-full w-full gap-[0.19rem] px-3"
                >
                  {/* Tools Panel */}
                  <ResizablePanel
                    defaultSize={toolsPanel}
                    minSize={15}
                    maxSize={40}
                    onResize={setToolsPanel}
                    className="min-w-0 rounded-sm"
                  >
                    <MediaPanel />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Preview Area */}
                  <ResizablePanel
                    defaultSize={previewPanel}
                    minSize={30}
                    onResize={setPreviewPanel}
                    className="min-w-0 min-h-0 flex-1"
                  >
                    <PreviewPanel />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={propertiesPanel}
                    minSize={15}
                    maxSize={40}
                    onResize={setPropertiesPanel}
                    className="min-w-0 rounded-sm"
                  >
                    <PropertiesPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Timeline */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0 px-3 pb-3"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
        <Onboarding />
      </div>
    </EditorProvider>
  );
}

export default function Editor() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">正在加载编辑器...</p>
          </div>
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
