"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeaderBase } from "./header-base";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function Header() {
  const leftContent = (
    <Link href="/editor" className="flex items-center gap-3">
      <Image
        src="/logo.svg"
        alt="OpenCut Logo"
        className="invert dark:invert-0"
        width={32}
        height={32}
      />
      <span className="text-xl font-medium hidden md:block">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <div className="flex items-center gap-4">
        <Link href="/landing">
          <Button variant="text" className="text-sm p-0">
            About
          </Button>
        </Link>
        <Link href="/blog">
          <Button variant="text" className="text-sm p-0">
            Blog
          </Button>
        </Link>
        <Link href="/contributors">
          <Button variant="text" className="text-sm p-0">
            Contributors
          </Button>
        </Link>
      </div>
      <Link href="/projects">
        <Button size="sm" className="text-sm ml-2">
          Projects
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <ThemeToggle className="mr-2" />
    </nav>
  );

  return (
    <div className="sticky top-4 z-50 mx-4 md:mx-0">
      <HeaderBase
        className="bg-background border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[11px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}
