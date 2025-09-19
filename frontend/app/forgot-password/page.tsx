"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState("");

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Password reset failed');
            }

            setMessage('Password reset link sent to your email!');

            toast.success('Password reset link sent to your email!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Password reset failed');
            setError('Error sending password reset link. Please try again.');
        }
    }

    return (
        <div className="flex flex-col w-full h-screen items-center justify-center p-4">
            <div className="overflow-hidden w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
                    <p className="text-gray-600">Enter your email to reset your password</p>
                </div>

                <form onSubmit={handlePasswordReset}>
                    <div className="mb-6">
                        <input
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 focus:outline-none bg-gray-50 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>
                    {message && <p className="text-center text-green-500 mb-4">{message}</p>}
                    {error && <p className="text-center text-red-500 mb-4">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
                    >
                        Send Reset Link
                    </button>
                </form>
            </div>
        </div>
    )
}