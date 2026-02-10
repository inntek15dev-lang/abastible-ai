
import React, { createContext, useContext, useState, useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import tutorialsData from '../data/tutorials.json';
import { useAuth } from './AuthContext';

const TutorialContext = createContext();

export function useTutorial() {
    return useContext(TutorialContext);
}

export function TutorialProvider({ children }) {
    const [activeTutorial, setActiveTutorial] = useState(null);
    const { user } = useAuth();
    const [driverObj, setDriverObj] = useState(null);;

    useEffect(() => {
        const dObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            stagePadding: 4,
            overlayColor: '#000000',
            overlayOpacity: 0.6,
            doneBtnText: 'Finalizar',
            closeBtnText: 'Cerrar',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            onDestroy: () => setActiveTutorial(null),
        });
        setDriverObj(dObj);
    }, []);

    const performAction = (element, action) => {
        if (!element || !action) return;

        setTimeout(() => {
            if (action.type === 'input') {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (action.type === 'click') {
                element.click();
            }
            if (action.type === 'focus') {
                element.focus();
            }
        }, 300); // Small delay to ensure element is ready
    };

    const startTutorial = (tutorialId) => {
        if (!driverObj) return;

        const tutorial = tutorialsData.find(t => t.id === tutorialId);
        if (!tutorial) {
            console.error(`Tutorial ${tutorialId} not found`);
            return;
        }

        // Check compatibility if user role is defined
        if (user && tutorial.role && user.role !== tutorial.role && user.role !== 'admin') {
            console.warn(`Tutorial ${tutorialId} is for ${tutorial.role}, user is ${user.role}`);
        }

        setActiveTutorial(tutorial);

        // Navigation Helper
        const startDriver = () => {
            const steps = tutorial.steps.map(step => ({
                element: step.element,
                popover: step.popover,
                onHighlightStarted: (element) => {
                    if (element) {
                        element.classList.add('tutorial-target-active');
                        // Force styles directly as a fallback
                        element.style.setProperty('outline', '3px solid #ff00ea', 'important');
                        element.style.setProperty('outline-offset', '2px', 'important');
                        element.style.setProperty('z-index', '1000000002', 'important');
                        element.style.setProperty('position', 'relative', 'important');
                        element.style.setProperty('background-color', '#fff9c4', 'important');

                        if (step.action) {
                            performAction(element, step.action);
                        }
                    }
                },
                onDeselected: (element) => {
                    if (element) {
                        element.classList.remove('tutorial-target-active');
                        // Clean up inline styles
                        element.style.removeProperty('outline');
                        element.style.removeProperty('outline-offset');
                        element.style.removeProperty('z-index');
                        element.style.removeProperty('position');
                        element.style.removeProperty('background-color');
                    }
                }
            }));

            driverObj.setSteps(steps);
            driverObj.drive();
        };

        if (tutorial.startUrl && window.location.pathname !== tutorial.startUrl) {
            window.location.href = tutorial.startUrl;
            localStorage.setItem('pending_tutorial', tutorialId);
            return;
        }

        startDriver();
    };

    // Effect to resume tutorial after navigation
    useEffect(() => {
        const pendingTutorialId = localStorage.getItem('pending_tutorial');
        if (pendingTutorialId && driverObj) {
            localStorage.removeItem('pending_tutorial');
            startTutorial(pendingTutorialId);
        }
    }, [driverObj]);


    return (
        <TutorialContext.Provider value={{ startTutorial, activeTutorial, tutorials: tutorialsData }}>
            {children}
        </TutorialContext.Provider>
    );
}
