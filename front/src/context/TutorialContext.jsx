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
    const [driverObj, setDriverObj] = useState(null);

    useEffect(() => {
        const dObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            stagePadding: 8,
            overlayColor: '#003594',
            overlayOpacity: 0.75,
            doneBtnText: 'Entendido',
            closeBtnText: 'X',
            nextBtnText: 'Continuar →',
            prevBtnText: '← Volver',
            popoverClass: 'theme_mode_tutorial',
            onDestroy: () => setActiveTutorial(null),
        });
        setDriverObj(dObj);
    }, []);

    // Helper to find elements, including dynamic "first of status X" logic
    const resolveElement = (step) => {
        if (!step.element) return null;
        if (typeof step.element === 'string') {
            // Check for dynamic syntax: ">> row-status:pendiente"
            if (step.element.startsWith('>> row-status:')) {
                const parts = step.element.replace('>> row-status:', '').trim().split(' ');
                const status = parts[0];
                const innerSelector = parts.slice(1).join(' ');

                // Find first row with this status
                const row = document.querySelector(`tr[data-status="${status}"]`);
                if (row) {
                    if (innerSelector) return row.querySelector(innerSelector) || row;
                    return row.querySelector('.btn-icon') || row.querySelector('.btn-action') || row.querySelector('a') || row;
                }
                return null;
            }
            return document.querySelector(step.element);
        }
        return step.element;
    };

    const performAction = (element, action) => {
        if (!element || !action) return;
        setTimeout(() => {
            if (action.type === 'input') {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (action.type === 'click') {
                element.click();
            } else if (action.type === 'focus') {
                element.focus();
            }
        }, 300);
    };

    const startTutorial = (tutorialId, stepIndex = 0) => {
        if (!driverObj) return;

        const tutorial = tutorialsData.find(t => t.id === tutorialId);
        if (!tutorial) return;

        setActiveTutorial(tutorial);

        const startDriver = (startIndex = 0) => {
            const steps = tutorial.steps.map((step, idx) => ({
                element: step.element,
                popover: {
                    ...step.popover,
                    onNextClick: () => {
                        // If this step triggers a navigation or action that requires a reload
                        if (step.action?.waitForReload) {
                            localStorage.setItem('pending_tutorial', tutorialId);
                            localStorage.setItem('pending_step', idx + 1);
                        }
                        
                        // Handle manual navigation steps in actions
                        if (step.action?.type === 'navigate') {
                            window.location.href = step.action.value;
                            return;
                        }

                        driverObj.moveNext();
                    }
                },
                onHighlightStarted: (element) => {
                    if (step.action) performAction(element, step.action);
                }
            }));

            // Pre-resolve dynamic elements for the driver
            const resolvedSteps = steps.map((s, idx) => {
                const stepDef = tutorial.steps[idx];
                if (stepDef && typeof stepDef.element === 'string' && stepDef.element.startsWith('>>')) {
                    const el = resolveElement(stepDef);
                    return el ? { ...s, element: el } : s;
                }
                return s;
            });

            driverObj.setSteps(resolvedSteps);
            driverObj.drive(startIndex);
        };

        // Initial navigation if startUrl is defined and we are not there
        if (stepIndex === 0 && tutorial.startUrl && window.location.pathname !== tutorial.startUrl) {
            localStorage.setItem('pending_tutorial', tutorialId);
            localStorage.setItem('pending_step', 0);
            window.location.href = tutorial.startUrl;
            return;
        }

        startDriver(stepIndex);
    };

    // Effect to resume tutorial after navigation
    useEffect(() => {
        const pendingTutorialId = localStorage.getItem('pending_tutorial');
        const pendingStep = parseInt(localStorage.getItem('pending_step') || '0');
        
        if (pendingTutorialId && driverObj) {
            localStorage.removeItem('pending_tutorial');
            localStorage.removeItem('pending_step');
            
            // Short delay to ensure DOM is ready on new page
            setTimeout(() => {
                startTutorial(pendingTutorialId, pendingStep);
            }, 500);
        }
    }, [driverObj]);


    return (
        <TutorialContext.Provider value={{ startTutorial, activeTutorial, tutorials: tutorialsData }}>
            {children}
        </TutorialContext.Provider>
    );
}
