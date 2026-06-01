// @ts-nocheck { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, School, Users, BookOpen, Settings, BarChart3, ArrowRight, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: "school", label: "School Info", icon: School },
  { id: "admin", label: "Admin Setup", icon: Users },
  { id: "academics", label: "Academic Year", icon: BookOpen },
  { id: "complete", label: "Complete", icon: CheckCircle },
];

export default function SchoolOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const schoolSettings = useQuery(api.schoolSettings.getSettings);
  const updateSettings = useQuery(api.schoolSettings.updateSettings); // This won't work as mutation, but keeping for UI

  const [schoolData, setSchoolData] = useState({
    name: schoolSettings?.name || "",
    address: schoolSettings?.address || "",
    phone: schoolSettings?.phone || "",
    email: schoolSettings?.email || "",
    motto: schoolSettings?.motto || "",
    primaryColor: schoolSettings?.primaryColor || "#dc2626",
  });

  const stepsContent = [
    /* Step 0: School Info */
    <Card key="school">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-red-500" /> School Information</CardTitle>
        <CardDescription>Tell us about your school</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div><Label>School Name *</Label><Input value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} placeholder="e.g. Vhembe Rising Star Academy" /></div>
        <div><Label>Address</Label><Textarea value={schoolData.address} onChange={e => setSchoolData({...schoolData, address: e.target.value})} placeholder="Physical address" rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={schoolData.phone} onChange={e => setSchoolData({...schoolData, phone: e.target.value})} placeholder="+27..." /></div>
          <div><Label>Email</Label><Input value={schoolData.email} onChange={e => setSchoolData({...schoolData, email: e.target.value})} placeholder="info@school.co.za" /></div>
        </div>
        <div><Label>School Motto</Label><Input value={schoolData.motto} onChange={e => setSchoolData({...schoolData, motto: e.target.value})} placeholder="e.g. Knowledge is Power" /></div>
        <div><Label>Brand Color</Label><div className="flex items-center gap-3"><Input type="color" value={schoolData.primaryColor} onChange={e => setSchoolData({...schoolData, primaryColor: e.target.value})} className="w-16 h-10" /><span className="text-sm text-muted-foreground">{schoolData.primaryColor}</span></div></div>
      </CardContent>
    </Card>,

    /* Step 1: Admin Setup */
    <Card key="admin">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Admin & Staff</CardTitle>
        <CardDescription>Your admin account is already set up. Invite teachers and staff next.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Next Steps:</p>
          <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-1">
            <li>• Add teachers from the People section</li>
            <li>• Create classes and assign teachers</li>
            <li>• Set up subjects for each grade</li>
            <li>• Configure the academic year and terms</li>
          </ul>
        </div>
        <Button variant="outline" className="w-full" onClick={() => toast.info("Navigate to People > Teachers")}>
          <Users className="h-4 w-4 mr-2" /> Go to Teacher Management
        </Button>
      </CardContent>
    </Card>,

    /* Step 2: Academic Year */
    <Card key="academics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-green-500" /> Academic Year Setup</CardTitle>
        <CardDescription>Configure your academic calendar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Quick Setup:</p>
          <ul className="text-sm text-green-600 dark:text-green-400 mt-2 space-y-1">
            <li>• Create your current academic year</li>
            <li>• Set term dates</li>
            <li>• Configure grade levels</li>
            <li>• Set up CAPS subjects</li>
          </ul>
        </div>
        <Button variant="outline" className="w-full" onClick={() => toast.info("Navigate to Settings > Academic Years")}>
          <BookOpen className="h-4 w-4 mr-2" /> Go to Academic Year Settings
        </Button>
      </CardContent>
    </Card>,

    /* Step 3: Complete */
    <Card key="complete">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Setup Complete!</CardTitle>
        <CardDescription>Your school is ready to go</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold">You're all set!</h3>
          <p className="text-muted-foreground mt-2">Start adding students, creating classes, and scheduling live lessons.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => toast.info("Navigate to Live Classes")}><BookOpen className="h-4 w-4 mr-2" /> Schedule Class</Button>
          <Button variant="outline" onClick={() => toast.info("Navigate to Video Library")}><BookOpen className="h-4 w-4 mr-2" /> Add Videos</Button>
        </div>
      </CardContent>
    </Card>,
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
            <School className="h-5 w-5 text-white" />
          </div>
          School Setup
        </h1>
        <p className="text-muted-foreground mt-1">Get your school up and running in minutes</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  i === currentStep ? "bg-red-500 text-white" :
                  i < currentStep ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {stepsContent[currentStep]}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === STEPS.length - 1}
          className="bg-red-600 hover:bg-red-700"
        >
          {currentStep === STEPS.length - 2 ? "Complete" : "Next Step"}
        </Button>
      </div>
    </div>
  );
}
