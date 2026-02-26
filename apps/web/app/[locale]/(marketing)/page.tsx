import { Button } from "@/components/ui/button";
import { PageMotion, StaggerContainer } from "@/components/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Bot, 
  Map as MapIcon, 
  LineChart, 
  Users, 
  Package, 
  CreditCard, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function LandingPage() {
  return (
    <PageMotion>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-24 sm:py-32 lg:px-8 text-white">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
        
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-slate-700 text-slate-400">
            Powered by Generative AI
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Intelligent ERP for the Modern Enterprise.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            GIMS combines powerful CRM, Inventory, and Finance tools with advanced AI assistance and geospatial analytics to streamline your business operations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 cursor-pointer">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features" className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors">
              Live Demo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Unique Capabilities */}
      <section id="features" className="container py-24 sm:py-32">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-primary">Unrivaled Efficiency</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Beyond Standard ERP Features
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Built for scalability and intelligence, GIMS offers unique tools that give your team an unfair advantage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AI Feature */}
          <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-all group">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot className="text-primary h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">AI Assistant CRUD</CardTitle>
              <p className="text-muted-foreground mt-2">
                Manage your entire system via natural language. Just ask "Create a leave request for tomorrow" or "List low stock items," and let AI do the heavy lifting.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-300 shadow-inner">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-primary animate-pulse">●</span>
                  <span>How can I help you today?</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                  <span className="text-blue-400">User:</span>
                  <span>Add a holiday for March 1st called "Company Anniversary"</span>
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <span className="text-green-400">AI:</span>
                  <span>I've created the holiday "Company Anniversary" for 2024-03-01. ID: HOL-982</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geospatial Feature */}
          <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-all group">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MapIcon className="text-primary h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Geospatial Analytics</CardTitle>
              <p className="text-muted-foreground mt-2">
                Visualize your distribution, sales areas, and employee presence across regions with high-fidelity map reporting at province, city, and district levels.
              </p>
            </CardHeader>
            <CardContent className="relative h-48 flex items-center justify-center bg-slate-900 overflow-hidden">
               <div className="absolute inset-0 bg-[url('/grid-overlay.png')] opacity-20"></div>
               <div className="z-10 text-center">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 backdrop-blur-md">
                    Live Map View
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">Visualizing Distribution Nodes in Indonesia</p>
               </div>
               {/* Mock Map Shapes */}
               <div className="absolute inset-0 flex items-center justify-center opacity-30 select-none pointer-events-none">
                  <svg viewBox="0 0 200 100" className="w-full h-full text-primary">
                    <path d="M20,50 Q40,20 60,50 T100,50 T140,50 T180,50" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="20" cy="50" r="3" fill="currentColor" />
                    <circle cx="60" cy="50" r="3" fill="currentColor" />
                    <circle cx="100" cy="50" r="3" fill="currentColor" />
                  </svg>
               </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Core Modules Grid */}
      <section className="bg-muted/50 py-24 sm:py-32">
        <div className="container">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                Everything you need to manage a global business.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Modules are tightly integrated, ensuring data consistency across Sales, CRM, Finance, and Human Resources.
              </p>
              
              <div className="mt-12 space-y-8">
                {[
                  { title: "Smart CRM", desc: "Pipeline management, lead scoring, and automated task scheduling.", icon: Users },
                  { title: "Inventory & Stock", desc: "Real-time stock tracking with low-stock alerts and movement history.", icon: Package },
                  { title: "Finance & Accounting", desc: "CoA, Journal entries, and fiscal reporting powered by automated workflows.", icon: CreditCard },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-none rounded-lg bg-background p-2 shadow-sm border border-border">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 h-[400px]">
              <div className="bg-primary/10 rounded-3xl p-6 flex flex-col justify-end">
                <LineChart className="h-8 w-8 text-primary mb-4" />
                <span className="text-4xl font-bold text-primary">99%</span>
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Accuracy</span>
              </div>
              <div className="bg-slate-950 rounded-3xl p-6 text-white flex flex-col justify-start">
                <Zap className="h-8 w-8 text-yellow-400 mb-4" />
                <span className="text-2xl font-bold">Fast Setup</span>
                <p className="text-sm text-slate-400 mt-2">Deploy in minutes, customize in days.</p>
              </div>
              <div className="col-span-2 bg-background border-2 border-border/50 rounded-3xl p-8 shadow-xl">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-green-500" />
                   </div>
                   <h4 className="text-xl font-bold underline decoration-primary lg:no-underline">Enterprise Security</h4>
                 </div>
                 <p className="text-muted-foreground">Encryption at rest, role-based access control, and full audit logs for every transaction.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32">
        <div className="container">
          <div className="relative isolate overflow-hidden bg-slate-950 px-6 py-24 shadow-2xl rounded-3xl sm:px-24 xl:py-32">
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to modernize your operations?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-slate-300">
              Join 500+ companies using GIMS to automate their business.
            </p>
            <div className="mt-10 flex justify-center gap-x-6">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-8 cursor-pointer">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/pricing" className="text-sm font-semibold leading-6 text-white hover:text-primary transition-colors flex items-center gap-1">
                View Pricing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageMotion>
  );
}
