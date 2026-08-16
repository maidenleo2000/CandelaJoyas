import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

/**
 * Component that handles the Android hardware back button.
 * - Navigates back in history if not on root.
 * - Navigates to root if no history but not on root.
 * - Double press to exit if on root.
 */
const BackButtonHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const lastTimeRef = useRef(0);
    
    // Refs to keep the listener closure up-to-date without re-registering
    const locationRef = useRef(location);
    const navigateRef = useRef(navigate);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    useEffect(() => {
        // Only register the listener on native platforms (primarily Android)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        console.log("BackButtonHandler: Initializing hardware back button listener");
        
        const handleBackButton = async (data) => {
            const currentPath = locationRef.current.pathname;
            const currentNavigate = navigateRef.current;

            console.log("BackButtonHandler: Event received. Path:", currentPath, "canGoBack:", data.canGoBack);
            
            // If we're not at the root page
            if (currentPath !== '/') {
                if (data.canGoBack) {
                    currentNavigate(-1);
                } else {
                    currentNavigate('/', { replace: true });
                }
                return;
            }

            // Exit logic for root page
            const currentTime = Date.now();
            if (currentTime - lastTimeRef.current < 2000) {
                App.exitApp();
            } else {
                lastTimeRef.current = currentTime;
                toast("Presiona de nuevo para salir", {
                    id: 'exit-toast',
                    duration: 2000,
                    position: 'bottom-center',
                    style: {
                        background: '#2B2D42',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'Inter, sans-serif'
                    }
                });
            }
        };

        const backButtonListener = App.addListener('backButton', handleBackButton);

        return () => {
            console.log("BackButtonHandler: Cleaning up");
            backButtonListener.then(l => l.remove());
        };
    }, []); // Run only once on mount

    return null;
};

export default BackButtonHandler;
