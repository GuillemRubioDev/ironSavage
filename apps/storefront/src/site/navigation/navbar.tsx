import {Logo} from '@/components/brand/logo';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Link} from '@/platform/i18n/navigation';
import {NavbarCollections} from '@/site/navigation/navbar/navbar-collections';
import {NavbarCart} from '@/site/navigation/navbar/navbar-cart';
import {NavbarUser} from '@/site/navigation/navbar/navbar-user';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {CurrencyPickerWrapper} from '@/site/navigation/navbar/currency-picker-wrapper';
import {MobileNavWrapper} from '@/site/navigation/navbar/mobile-nav-wrapper';
import {Suspense} from "react";
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {SearchInput} from '@/site/navigation/search-input';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';

export function Navbar() {
    return (
        <header className="fixed top-[var(--top-bar-h)] left-0 right-0 z-40 border-b backdrop-blur-md bg-background/80">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-[var(--header-h)] gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <Suspense>
                            <MobileNavWrapper currencyPicker={<CurrencyPickerWrapper />} />
                        </Suspense>
                        <NavigationLink href="/" className="shrink-0">
                            <Logo variant="wordmark" priority className="h-6 md:h-7" />
                        </NavigationLink>
                    </div>
                    {/* min-w-0 lets this genuinely shrink below its content's natural
                        width instead of overflowing past its own box (which is what
                        used to visually overlap the icon cluster on the right) — if
                        the collection list is ever too wide for the space left after
                        the logo and icons take theirs, it scrolls horizontally inside
                        its own bounds rather than spilling into a sibling.
                        lg (1024px), not md (768px): at 768 there genuinely isn't room
                        for the full collection list even with the shrink/scroll above
                        — it silently clipped mid-word with no visible scroll cue, so
                        tablet keeps the (fully worked out) hamburger drawer instead. */}
                    <nav className="hidden lg:flex flex-1 min-w-0 items-center gap-3 overflow-x-auto scrollbar-none">
                        <Suspense>
                            <NavbarCollections/>
                        </Suspense>
                    </nav>
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Full inline search only where there's genuinely room for its
                            fixed width alongside the collection nav (2xl+, 1536px) — at
                            narrower desktop widths (a very common range, incl. 1440px)
                            it used to get forced to overlap the nav, since neither side
                            of this row can shrink (nowrap nav labels, fixed-width input).
                            Below 2xl, a plain icon linking to the dedicated /search page
                            covers the same feature without demanding 256px of row space;
                            mobile has its own full search field in the drawer already. */}
                        <div className="hidden 2xl:flex">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput/>
                            </Suspense>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden lg:flex 2xl:hidden"
                            render={<Link href="/search" />}
                        >
                            <Search className="size-5" />
                        </Button>
                        <div className="hidden lg:flex items-center gap-3">
                            <Suspense>
                                <LanguagePicker />
                            </Suspense>
                            <Suspense>
                                <CurrencyPickerWrapper />
                            </Suspense>
                            <Suspense>
                                <ThemeSwitcher />
                            </Suspense>
                        </div>
                        <Suspense>
                            <NavbarCart/>
                        </Suspense>
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser/>
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
