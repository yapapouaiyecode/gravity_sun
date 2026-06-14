// gravity_pixel_art.js
// Pixel de gravité style pixel-art + Ctrl clic gauche pour régler la gravité

(function () {
    "use strict";

    let ctrlDown = false;

    document.addEventListener("keydown", function (e) {
        if (e.key === "Control") ctrlDown = true;
    });

    document.addEventListener("keyup", function (e) {
        if (e.key === "Control") ctrlDown = false;
    });

    document.addEventListener("mousedown", function (e) {
        ctrlDown = e.ctrlKey;
    }, true);

    document.addEventListener("mouseup", function (e) {
        ctrlDown = e.ctrlKey;
    }, true);

    window.addEventListener("blur", function () {
        ctrlDown = false;
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function sign(n) {
        if (n > 0) return 1;
        if (n < 0) return -1;
        return 0;
    }

    // Petit sprite pixel-art 7x7
    // . = vide
    // 1/2/3 = couleurs du carré
    const GRAVITY_ART = [
        ".......",
        ".11111.",
        ".12221.",
        ".12321.",
        ".12221.",
        ".11111.",
        "......."
    ];

    const ART_COLORS = {
        "1": "#241a1a",
        "2": "#38211e",
        "3": "#4b2b24"
    };

    function createPixelArtBlock(corePixel) {
        const startX = corePixel.x - 3;
        const startY = corePixel.y - 3;

        for (let yy = 0; yy < GRAVITY_ART.length; yy++) {
            for (let xx = 0; xx < GRAVITY_ART[yy].length; xx++) {
                const char = GRAVITY_ART[yy][xx];

                if (char === ".") continue;

                const x = startX + xx;
                const y = startY + yy;

                if (outOfBounds(x, y)) continue;

                // Centre = vrai pixel de gravité
                if (x === corePixel.x && y === corePixel.y) {
                    corePixel.color = ART_COLORS[char];
                    continue;
                }

                if (isEmpty(x, y, false)) {
                    createPixel("gravity_pixel_art_body", x, y);

                    const newPixel = pixelMap[x][y];
                    if (newPixel) {
                        newPixel.color = ART_COLORS[char];
                        newPixel.linkedGravityX = corePixel.x;
                        newPixel.linkedGravityY = corePixel.y;
                    }
                }
            }
        }
    }

    function findGravityCore(pixel) {
        // Cherche le centre du bloc autour du pixel décoratif
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
                const x = pixel.x + dx;
                const y = pixel.y + dy;

                if (outOfBounds(x, y)) continue;

                const nearby = pixelMap[x][y];

                if (nearby && nearby.element === "gravity_pixel_art_core") {
                    return nearby;
                }
            }
        }

        return null;
    }

    function openGravityPopup(pixel) {
        const currentValue = pixel.gravityPower || 30;

        promptInput(
            "Choisis la puissance de gravité.\n\n10 = faible\n30 = normal\n80 = fort\n150 = énorme\n0 = désactivé\n-30 = répulsion",
            function (value) {
                let number = parseFloat(value);

                if (isNaN(number)) {
                    logMessage("Nombre invalide.");
                    return;
                }

                number = clamp(number, -200, 200);

                pixel.gravityPower = number;

                if (number > 0) {
                    pixel.color = "#4b2b24";
                    logMessage("Gravité : " + number);
                } else if (number < 0) {
                    pixel.color = "#2f5b7a";
                    logMessage("Répulsion : " + number);
                } else {
                    pixel.color = "#555555";
                    logMessage("Gravité désactivée.");
                }
            },
            "Réglage gravité",
            String(currentValue)
        );
    }

    function applyGravity(pixel) {
        const power = pixel.gravityPower || 30;

        if (power === 0) return;

        const radius = clamp(Math.abs(power), 1, 200);
        const radiusSq = radius * radius;
        const repulse = power < 0;

        const minX = Math.max(0, pixel.x - radius);
        const maxX = Math.min(width - 1, pixel.x + radius);
        const minY = Math.max(0, pixel.y - radius);
        const maxY = Math.min(height - 1, pixel.y + radius);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const target = pixelMap[x][y];

                if (!target) continue;
                if (target === pixel) continue;
                if (target.element === "gravity_pixel_art_core") continue;
                if (target.element === "gravity_pixel_art_body") continue;

                const dx = pixel.x - target.x;
                const dy = pixel.y - target.y;

                const distSq = dx * dx + dy * dy;

                if (distSq < 1 || distSq > radiusSq) continue;

                const dist = Math.sqrt(distSq);

                const chance = clamp(1 - dist / radius, 0.02, 1);

                if (Math.random() > chance) continue;

                let moveX = sign(dx);
                let moveY = sign(dy);

                if (repulse) {
                    moveX *= -1;
                    moveY *= -1;
                }

                const moves = [];

                if (moveX !== 0 && moveY !== 0) {
                    moves.push([target.x + moveX, target.y + moveY]);
                }

                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (moveX !== 0) moves.push([target.x + moveX, target.y]);
                    if (moveY !== 0) moves.push([target.x, target.y + moveY]);
                } else {
                    if (moveY !== 0) moves.push([target.x, target.y + moveY]);
                    if (moveX !== 0) moves.push([target.x + moveX, target.y]);
                }

                for (const move of moves) {
                    const nx = move[0];
                    const ny = move[1];

                    if (outOfBounds(nx, ny)) continue;

                    if (isEmpty(nx, ny, false)) {
                        tryMove(target, nx, ny, undefined, true);
                        break;
                    }
                }
            }
        }
    }

    elements.gravity_pixel_art_core = {
        name: "Bloc gravité pixel-art",
        color: "#4b2b24",
        behavior: behaviors.WALL,
        category: "special",
        state: "solid",
        density: 999999,
        hardness: 1,
        glow: false,

        properties: {
            gravityPower: 30
        },

        onPlace: function (pixel) {
            pixel.gravityPower = 30;
            createPixelArtBlock(pixel);
        },

        tick: function (pixel) {
            applyGravity(pixel);
        },

        onClicked: function (pixel) {
            if (ctrlDown) {
                openGravityPopup(pixel);
            }
        },

        desc: "Bloc de gravité style pixel-art. Fais Ctrl + clic gauche dessus pour choisir la gravité."
    };

    elements.gravity_pixel_art_body = {
        name: "Corps bloc gravité",
        color: "#241a1a",
        behavior: behaviors.WALL,
        category: "special",
        hidden: true,
        state: "solid",
        density: 999999,
        hardness: 1,
        movable: false,

        onClicked: function (pixel) {
            if (!ctrlDown) return;

            const core = findGravityCore(pixel);

            if (core) {
                openGravityPopup(core);
            }
        }
    };

})();
