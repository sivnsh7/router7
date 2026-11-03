"use client";

import { type FC } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

const FaGoogle: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);
const FaApple: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor" width="1em" height="1em">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.59-7.71-11.72-14-6.42-9.69-11.22-20.73-14.41-33.12-3.19-12.39-4.78-24.32-4.78-35.79 0-14.35 3.63-26.34 10.89-35.98 7.26-9.64 16.5-14.52 27.72-14.64 4.58 0 9.87 1.25 15.87 3.76 6 2.5 10.14 3.76 12.42 3.76 1.85 0 6.13-1.31 12.85-3.93 6.72-2.62 12.18-3.8 16.39-3.55 12.39.76 22.38 5.23 29.98 13.41-10.9 6.64-16.23 15.65-16 27.03.22 8.94 3.54 16.48 9.97 22.63 6.43 6.15 14.15 9.77 23.16 10.86-2.39 7.4-5.33 14.9-8.81 22.52zM119.22 32.64c0-7.29 2.56-14.28 7.68-20.97 5.12-6.69 11.69-10.97 19.72-12.84 0 1.09.05 2.07.15 2.94 0 7.29-2.67 14.33-8.01 21.13-5.34 6.8-12 11.12-19.98 12.96-.33-1.2-.56-2.27-.56-3.22z"/>
  </svg>
);


/*  TYPES  */

interface SwapFormTexts {
    signInTitle: string;
    signUpTitle: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    signInButton: string;
    signUpButton: string;
    footerSignIn: string;
    footerSignUp: string;
    footerSignInCta: string;
    footerSignUpCta: string;
}

interface SwapFormProps {
    isSignIn: boolean;
    onModeChange: (isSignIn: boolean) => void;
    texts?: Partial<SwapFormTexts>;
}

/*  DEFAULT TEXTS  */

const DEFAULT_TEXTS: SwapFormTexts = {
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    signInSubtitle: "Hey friend, welcome back!",
    signUpSubtitle: "Just one more step to get started!",
    signInButton: "Get Sign In Code",
    signUpButton: "Create Account",
    footerSignIn: "Don't have account?",
    footerSignUp: "Already have account?",
    footerSignInCta: "Create Account",
    footerSignUpCta: "Sign In",
};

/*  COMPONENT  */

export const SwapForm: FC<SwapFormProps> = ({
    isSignIn,
    onModeChange,
    texts = {},
}) => {
    const mergedTexts = { ...DEFAULT_TEXTS, ...texts };

    /* Animations */
    const variants: Variants = {
        initial: {
            opacity: 0,
            y: -30,
            scale: 0.97,
            filter: "blur(4px)",
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
        },
        exit: {
            opacity: 0,
            y: -30,
            scale: 0.97,
            filter: "blur(4px)",
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isSignIn ? "signin" : "signup"}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    ease: "easeIn",
                    duration: 0.3,
                }}
                className="w-xs sm:w-sm bg-[#F6F5FA] dark:bg-zinc-900 shadow-[0_10px_20px_rgba(0,0,0,0.08)] rounded-[32px] overflow-hidden border-[1.5px] border-[#E6E6EF] dark:border-zinc-800 transition-colors"
            >
                <div className="p-6 sm:p-8 pb-8 sm:pb-10 border-b-[1.2px] bg-[#FEFEFE] dark:bg-zinc-950 rounded-[28px] border-[#E6E6EF] dark:border-zinc-800 transition-colors">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#191919] dark:text-zinc-100 mb-1.5 sm:mb-2 text-center sm:text-left">
                        {isSignIn
                            ? mergedTexts.signInTitle
                            : mergedTexts.signUpTitle}
                    </h2>

                    <p className="text-[#ADADB0] dark:text-zinc-500 text-[15px] sm:text-[17px] mb-4 sm:mb-6 text-center sm:text-left">
                        {isSignIn
                            ? mergedTexts.signInSubtitle
                            : mergedTexts.signUpSubtitle}
                    </p>

                    {/* Social Buttons */}
                    <div className="space-y-2.5 sm:space-y-3">
                        <button className="w-full flex shadow-sm items-center justify-center gap-2 sm:gap-3 py-3 px-4 border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 rounded-xl font-medium text-[#131313] dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-[15px] sm:text-base">
                            <FaGoogle className="text-lg sm:text-xl" />
                            Continue with Google
                        </button>

                        <button className="w-full flex shadow-sm items-center justify-center gap-2 sm:gap-3 py-3 px-4 border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 rounded-xl font-medium text-[#131313] dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-[15px] sm:text-base">
                            <FaApple className="text-[22px] sm:text-[26px]" />
                            Continue with Apple
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-5 sm:my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#ECEBEE] dark:via-zinc-800 to-transparent" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-zinc-950 text-[12px] sm:text-[14px] px-2 text-gray-400 dark:text-zinc-600">
                                OR
                            </span>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-6 sm:space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-[#0B0B0B] dark:text-zinc-300 mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full px-4 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-black dark:focus:ring-zinc-400 outline-none shadow-sm text-[15px] sm:text-base"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="w-full py-3 sm:py-3.5 bg-[#030303] dark:bg-zinc-100 text-[#FAFAFA] dark:text-zinc-900 rounded-xl font-semibold shadow-lg text-[15px] sm:text-base"
                        >
                            {isSignIn
                                ? mergedTexts.signInButton
                                : mergedTexts.signUpButton}
                        </motion.button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3 sm:py-4 text-center">
                    <p className="text-[#a8a7b0] dark:text-zinc-500 text-[13px] sm:text-[14px]">
                        {isSignIn
                            ? mergedTexts.footerSignIn
                            : mergedTexts.footerSignUp}
                        <button
                            onClick={() => onModeChange(!isSignIn)}
                            className="ml-1 font-medium text-black dark:text-white"
                        >
                            {isSignIn
                                ? mergedTexts.footerSignInCta
                                : mergedTexts.footerSignUpCta}
                        </button>
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};