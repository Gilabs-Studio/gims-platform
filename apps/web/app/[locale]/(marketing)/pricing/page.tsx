import { Button } from "@/components/ui/button";
import { PageMotion, StaggerContainer } from "@/components/motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Building2, Rocket, Globe } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  const tiers = [
    {
      name: "Startup",
      price: "1.5jt",
      description: "Essential ERP for small teams starting their automation journey.",
      features: [
        "Basic CRM & Pipeline",
        "Personnel Attendance",
        "Up to 5 User Accounts",
        "1 GB Data Storage",
        "Community Support",
      ],
      notIncluded: [
        "AI Assistant CRUD",
        "Geospatial Reporting",
        "Advanced Analytics",
        "Custom Module Dev",
      ],
      icon: Rocket,
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Business",
      price: "4.5jt",
      description: "The complete package for growing SMEs needing AI & Maps.",
      features: [
        "Full CRM & Sales Cycle",
        "Inventory Management",
        "AI Assistant (Basic Query)",
        "Basic Geographic Map",
        "Up to 25 User Accounts",
        "10 GB Data Storage",
        "Priority Email Support",
      ],
      notIncluded: [
        "AI CRUD Actions",
        "Regional Level Reports",
        "Custom Module Dev",
      ],
      icon: Sparkles,
      cta: "Get Started",
      popular: true,
    },
    {
      name: "Premium",
      price: "12jt",
      description: "Unleash the full power of GIMS with full AI and Geo capabilities.",
      features: [
        "Advanced AI CRUD Assistant",
        "Province/City/District Maps",
        "In-depth Financial Reports",
        "Full Purchase & Sales Flow",
        "Unlimited User Accounts",
        "50 GB Data Storage",
        "24/7 Dedicated Support",
        "API Access (Read/Write)",
      ],
      notIncluded: [
        "Custom Module Dev",
      ],
      icon: Globe,
      cta: "Go Premium",
      popular: false,
    },
    {
      name: "GIMS Prime",
      price: "Custom",
      description: "Tailor-made solution for large corporations with unique needs.",
      features: [
        "Everything in Premium",
        "Custom Module Development",
        "On-Premise Deployment",
        "White-label Option",
        "Dedicated Success Manager",
        "Custom Integration Support",
        "Scalable Data Storage",
      ],
      notIncluded: [],
      icon: Building2,
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <PageMotion className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-950/20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Choose the plan that fits your current needs and scale when you're ready. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card 
              key={tier.name} 
              className={cn(
                "relative flex flex-col transition-all hover:shadow-xl",
                tier.popular ? "ring-2 ring-primary shadow-lg scale-105 z-10" : "border-border"
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-0 pr-4">
                  <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1">
                    MOST POPULAR
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <tier.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">Rp {tier.price}</span>
                  {tier.price !== "Custom" && <span className="text-sm text-muted-foreground">/bln</span>}
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 pt-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {tier.notIncluded.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground/60">
                      <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={tier.cta === "Contact Sales" ? "mailto:sales@gilabs.com" : "/login"} className="w-full">
                  <Button 
                    variant={tier.popular ? "default" : "outline"} 
                    className="w-full cursor-pointer h-11"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-24 bg-background border rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-2xl font-bold">Needs something more specific?</h3>
            <p className="text-muted-foreground mt-2">
              Our "GIMS Prime" tier is designed for enterprises needing custom ERP modules, specialized workflows, or dedicated infrastructure.
            </p>
          </div>
          <Link href="mailto:custom@gilabs.com">
            <Button size="lg" className="rounded-full px-8 cursor-pointer">
              Book a Consultation
            </Button>
          </Link>
        </div>
      </div>
    </PageMotion>
  );
}

import { cn } from "@/lib/utils";
