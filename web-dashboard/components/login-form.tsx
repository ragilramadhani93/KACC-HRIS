"use client";

import { useActionState } from "react";
import { authenticate } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function LoginForm() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                    Enter your username below to login to your account.
                </CardDescription>
            </CardHeader>
            <form action={dispatch}>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" name="username" type="text" placeholder="admin" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    {errorMessage && (
                        <div className="flex h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled={isPending}>
                        {isPending ? "Logging in..." : "Sign in"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
