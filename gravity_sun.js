// gravity_sun.js
// Mod Sandboxels : soleils gravitationnels
// Place un soleil, puis tous les pixels proches sont attirés vers lui.

(function () {
    "use strict";

    const MODES = {
        faible: {
            radius: 18,
            chance: 0.35,
            heat: 0.05,
            color: "#ffd36a"
        },
        normal: {
            radius: 32,
            chance: 0.55,
            heat: 0.15,
            color: "#ff9c2a"
        },
        fort: {
            radius: 55,
            chance: 0.8,
            heat: 0.35,
            color: "#ff4a00"
        },
        trou_noir: {
            radius: 70,
            chance: 1,
            heat: 0,
            consume: true,
            color: "#1a082e"
        },
        repulsion: {
            radius: 42,
            chance: 0.7,
            heat: 0,
            repel: true,
            color: "#69dbff"
        }
    };

    const MODE_ORDER = ["faible", "normal", "fort", "trou_noir", "repulsion"];

    const GRAVITY_SUN_ELEMENTS = [
        "weak_gravity_sun",
        "gravity_sun",
        "strong_gravity_sun",
        "black_gravity_sun",
        "white_gravity_sun",
        "custom_gravity_sun"
    ];

    const IMMUNE = {};
    GRAVITY_SUN_ELEMENTS.forEach(name => IMMUNE[name] = true);
    IMMUNE.gravity_sun_picker = true;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function sign(n) {
        if (n > 0) return 1;
        if (n < 0) return -1;
        return 0;
    }

    function getGravityMode(pixel) {
        const elementData = elements[pixel.element];
        const modeName = pixel.gravitySunMode || elementData.gravitySunMode || "normal";
        return MODES[modeName] || MODES.normal;
    }

    function canBePulled(pixel) {
        if (!pixel) return false;
        if (IMMUNE[pixel.element]) return false;
        return true;
    }

    function movePixelTowardSun(sunPixel, targetPixel, config) {
        const dx = sunPixel.x - targetPixel.x;
        const dy = sunPixel.y - targetPixel.y;

        if (dx === 0 && dy === 0) return;

        // Le trou noir supprime les pixels très proches.
        if (
            config.consume &&
            Math.abs(dx) <= 1 &&
            Math.abs(dy) <= 1
        ) {
            deletePixel(targetPixel.x, targetPixel.y);
            return;
        }

        let stepX = sign(dx);
        let stepY = sign(dy);

        // Mode répulsion : inverse la direction.
        if (config.repel) {
            stepX *= -1;
            stepY *= -1;
        }

        const x = targetPixel.x;
        const y = targetPixel.y;

        const moves = [];

        // Diagonale d'abord pour donner un effet plus naturel.
        if (stepX !== 0 && stepY !== 0) {
            moves.push([x + stepX, y + stepY]);
        }

        // Puis axe dominant.
        if (Math.abs(dx) >= Math.abs(dy)) {
            if (stepX !== 0) moves.push([x + stepX, y]);
            if (stepY !== 0) moves.push([x, y + stepY]);
        } else {
            if (stepY !== 0) moves.push([x, y + stepY]);
            if (stepX !== 0) moves.push([x + stepX, y]);
        }

        // Petit chaos pour éviter un mouvement trop robotique.
        if (Math.random() < 0.12) {
            moves.reverse();
        }

        for (const move of moves) {
            const nx = move[0];
            const ny = move[1];

            if (outOfBounds(nx, ny)) continue;

            if (isEmpty(nx, ny, false)) {
                if (tryMove(targetPixel, nx, ny, undefined, true)) {
                    if (typeof pixelTicks !== "undefined") {
                        targetPixel._gravitySunTick = pixelTicks;
                    }
                    return;
                }
            }
        }
    }

    function applyGravity(sunPixel) {
        const config = getGravityMode(sunPixel);
        const radius = config.radius;
        const radiusSq = radius * radius;

        const minX = Math.max(0, sunPixel.x - radius);
        const maxX = Math.min(width - 1, sunPixel.x + radius);
        const minY = Math.max(0, sunPixel.y - radius);
        const maxY = Math.min(height - 1, sunPixel.y + radius);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const targetPixel = pixelMap[x][y];

                if (!canBePulled(targetPixel)) continue;

                if (
                    typeof pixelTicks !== "undefined" &&
                    targetPixel._gravitySunTick === pixelTicks
                ) {
                    continue;
                }

                const dx = sunPixel.x - x;
                const dy = sunPixel.y - y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 1 || distSq > radiusSq) continue;

                const dist = Math.sqrt(distSq);

                // Plus le pixel est proche, plus il est attiré.
                const pullChance = clamp(
                    config.chance * (1.15 - dist / (radius + 1)),
                    0.02,
                    1
                );

                if (Math.random() < pullChance) {
                    // Chauffe légère sauf répulsion/trou noir.
                    if (config.heat && !config.repel) {
                        targetPixel.temp = (targetPixel.temp || 20) +
                            config.heat * clamp(1 - dist / radius, 0, 1);
                    }

                    movePixelTowardSun(sunPixel, targetPixel, config);
                }
            }
        }
    }

    function addGravitySunElement(id, modeName, displayName, description) {
        const config = MODES[modeName];

        elements[id] = {
            name: displayName,
            color: [config.color, "#fff2a8", "#ffcf40"],
            behavior: behaviors.WALL,
            category: "special",
            state: "solid",
            density: 999999,
            hardness: 1,
            temp: 5000,
            glow: true,
            gravitySunMode: modeName,
            tick: function (pixel) {
                applyGravity(pixel);
            },
            desc: description
        };
    }

    addGravitySunElement(
        "weak_gravity_sun",
        "faible",
        "Soleil gravité faible",
        "Petit soleil qui attire doucement les pixels proches."
    );

    addGravitySunElement(
        "gravity_sun",
        "normal",
        "Soleil gravitationnel",
        "Soleil qui attire les pixels autour de lui."
    );

    addGravitySunElement(
        "strong_gravity_sun",
        "fort",
        "Soleil gravité forte",
        "Soleil puissant qui attire beaucoup plus loin."
    );

    addGravitySunElement(
        "black_gravity_sun",
        "trou_noir",
        "Soleil trou noir",
        "Attire fortement les pixels et les absorbe quand ils sont trop proches."
    );

    addGravitySunElement(
        "white_gravity_sun",
        "repulsion",
        "Soleil répulsif",
        "Repousse les pixels au lieu de les attirer."
    );

    elements.custom_gravity_sun = {
        name: "Soleil gravité custom",
        color: ["#ff9c2a", "#fff2a8"],
        behavior: behaviors.WALL,
        category: "special",
        state: "solid",
        density: 999999,
        hardness: 1,
        temp: 5000,
        glow: true,
        onPlace: function (pixel) {
            pixel.gravitySunMode = "normal";
        },
        tick: function (pixel) {
            applyGravity(pixel);
        },
        desc: "Soleil personnalisable. Utilise l'outil Sélecteur gravité soleil dessus pour changer son mode."
    };

    elements.gravity_sun_picker = {
        name: "Sélecteur gravité soleil",
        color: "#7be7ff",
        category: "tools",
        tool: function (pixel) {
            if (!pixel) return;
            if (!GRAVITY_SUN_ELEMENTS.includes(pixel.element)) return;

            const currentMode =
                pixel.gravitySunMode ||
                elements[pixel.element].gravitySunMode ||
                "normal";

            let index = MODE_ORDER.indexOf(currentMode);
            if (index < 0) index = 1;

            const nextMode = MODE_ORDER[(index + 1) % MODE_ORDER.length];

            pixel.gravitySunMode = nextMode;
            pixel.color = MODES[nextMode].color;

            if (typeof logMessage === "function") {
                logMessage("Mode du soleil : " + nextMode);
            }
        },
        desc: "Clique sur un soleil gravitationnel pour changer son mode : faible, normal, fort, trou noir, répulsion."
    };

})();
