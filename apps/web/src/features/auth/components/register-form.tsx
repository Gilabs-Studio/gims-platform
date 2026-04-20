"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/routing";
import { AuthLayout } from "./auth-layout";
import { ButtonLoading } from "@/components/loading";
import { authService } from "../services/auth-service";
import { useAuthStore } from "../stores/use-auth-store";

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  company_name: string;
}

type FormErrors = Partial<RegisterFormValues> & { general?: string };

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const { setUser, setSessionVerified } = useAuthStore();

  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    password: "",
    company_name: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Full name is required";
    if (!values.email.trim()) {
      next.email = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = "Please enter a valid email address";
    }
    if (!values.password) {
      next.password = "Password is required";
    } else if (values.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (!values.company_name.trim()) next.company_name = "Company name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: keyof RegisterFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const csrfToken = await authService.prefetchCSRFToken();
      const response = await authService.register(values, csrfToken);

      if (response.success && response.data) {
        setUser(response.data.user);
        setSessionVerified(true);
        useAuthStore.setState({ error: null });
        // Redirect to dashboard — keep isLoading true until navigation completes
        router.replace("/dashboard");
        return;
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { error?: { code?: string; message?: string } } };
        message?: string;
      };
      const code = axiosError?.response?.data?.error?.code;
      if (code === "EMAIL_ALREADY_TAKEN") {
        setErrors({ email: "This email address is already registered" });
      } else if (code === "COMPANY_NAME_TAKEN") {
        setErrors({ company_name: "This company name is already taken, please choose another" });
      } else {
        setErrors({
          general:
            axiosError?.response?.data?.error?.message ||
            axiosError?.message ||
            "Registration failed. Please try again.",
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {t("title")}
            </CardTitle>
            <CardDescription className="text-sm">
              {t("description")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup className="space-y-4">
                {errors.general && (
                  <p className="text-sm text-destructive text-center">{errors.general}</p>
                )}

                <Field>
                  <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    value={values.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.name}
                    className="h-11"
                  />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    value={values.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    className="h-11"
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t("passwordPlaceholder")}
                      value={values.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      disabled={isLoading}
                      aria-invalid={!!errors.password}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && <FieldError>{errors.password}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="company_name">{t("companyLabel")}</FieldLabel>
                  <Input
                    id="company_name"
                    type="text"
                    autoComplete="organization"
                    placeholder={t("companyPlaceholder")}
                    value={values.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.company_name}
                    className="h-11"
                  />
                  {errors.company_name && <FieldError>{errors.company_name}</FieldError>}
                </Field>

                <Field className="pt-1">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 w-full text-sm font-semibold tracking-wide"
                  >
                    <ButtonLoading loading={isLoading} loadingText={t("submitting")}>
                      {t("submit")}
                    </ButtonLoading>
                  </Button>
                </Field>
              </FieldGroup>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                {t("signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AuthLayout>
  );
}