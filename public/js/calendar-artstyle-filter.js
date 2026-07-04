/**
 * calendar-artstyle-filter.js
 * Unified Art Style filter — two tabs:
 *   "By Region"      → Area → Classical / Illustrated / Modernist → Style
 *   "By Philosophy"  → Group (Classical/Illustrated/Abstract/Atmospheric) → Style
 *
 * Grid images come from Google Calendar event attachments uploaded by
 * update_art_style_tags.py.  Attachment titles look like "grid_cinematic.png".
 * This module scans cloudmailLatestEvents.items to build a map of
 *   styleName → Drive fileUrl
 * and uses that map to display real artwork thumbnails in the filter tree.
 *
 * If no event has a given style's grid image the tile still renders (with a
 * gradient placeholder) so users can click through and add new content.
 *
 * State:
 *   this.state.calendar.videoTagsFilter.artStyle  — active filter value
 *   this._artStyleTab   — 'region' | 'phil'
 *   this._artStyleExp   — expanded node map
 *   this._artStyleImageCache — Map<lowerStyleSlug, fileUrl>  (built lazily)
 */

const CalendarArtStyleFilter = {

    // =========================================================================
    // GRID IMAGE CACHE  (built from event attachments)
    // =========================================================================

    /**
     * Scan all loaded events for attachments whose title starts with "grid_".
     * Populate this._artStyleImageCache  →  Map<slug, url>
     * where slug = filename stem lowercased, e.g. "grid_cinematic.png" → "cinematic"
     *
     * Called lazily before every render so new events are picked up automatically.
     */
    _buildArtStyleImageCache() {
        const cache = new Map();
        const items = window.cloudmailLatestEvents?.items || [];

        // Also include events from localStorage
        let localEvents = [];
        try {
            localEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        } catch (e) { }

        const allItems = [...items, ...localEvents];

        allItems.forEach(ev => {
            const attachments = ev.attachments || [];
            attachments.forEach(att => {
                const title = (att.title || '').toLowerCase();
                if (!title.match(/\.(png|jpe?g|webp|gif)$/i)) return;

                let slug = title.slice(0, title.lastIndexOf('.'));
                if (slug.startsWith('grid_')) slug = slug.slice(5);
                // Skip layout/format variants — not art style names
                if (/^(3x3|916)/.test(slug)) return;
                const slugHyphen = slug.replace(/_/g, '-');    // e.g. "oil-painting"

                // Extract fileId for thumbnail URL
                const rawUrl = att.fileUrl || '';
                const idMatch = rawUrl.match(/\/d\/([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/id=([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
                const fileId = att.fileId || (idMatch ? idMatch[1] : '');

                // Use thumbnail as primary (more permissive than lh3),
                // fall back to /api/style-image/ which generates via CF AI
                const url = fileId
                    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
                    : null;

                if (!cache.has(slug)) cache.set(slug, url);
                if (!cache.has(slugHyphen)) cache.set(slugHyphen, url);
            });
        });

        this._artStyleImageCache = cache;
    },

    /**
     * Convert a Drive share URL to a direct-download URL, or return the original.
     * Also handles already-direct URLs gracefully.
     */
    _driveDirectUrl(url) {
        if (!url) return '';
        if (url.includes('lh3.googleusercontent.com')) return url;
        if (url.includes('drive.google.com/uc?')) return url;
        if (url.includes('drive.google.com/thumbnail')) return url;
        const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
        if (m) {
            // thumbnail works without full public share in more cases than lh3
            return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
        }
        return url;
    },

    /**
     * Convert a style name to the static /style-images/ URL.
     * Files live in  public/style-images/  and are served as static assets.
     *   "Realism"             → "/style-images/realism.png"
     *   "Abstract Expressionism" → "/style-images/abstract-expressionism.png"
     */
    _serverStyleImageUrl(styleName) {
        if (!styleName) return '';
        const filename = styleName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.png';
        const path = `/style-images/${filename}`;
        return window._getAssetUrl ? window._getAssetUrl(path) : path;
    },

    /**
     * Return the best available image URL for a style name.
     *
     * Priority:
     *   1. Google Drive attachment from a calendar event (grid_<slug>.png)
     *   2. Server-side /style-images/<slug>.png  (always available for known
     *      styles — this was the original sole source before this PR)
     */
    _getGridImageUrl(styleName) {
        if (!styleName) return '';
        if (!this._artStyleImageCache) this._buildArtStyleImageCache();

        const cache = this._artStyleImageCache;
        const lower = styleName.toLowerCase();
        const hyphen = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const under = lower.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        // Check Drive thumbnail cache first
        if (cache.size > 0) {
            for (const key of [lower, hyphen, under]) {
                const val = cache.get(key);
                if (val) return val; // Drive thumbnail URL
            }
            // Partial match
            for (const [key, url] of cache) {
                if (url && key.length >= 5 &&
                    (lower === key || lower.includes(key) || key.includes(lower))) {
                    return url;
                }
            }
        }

        // Always-available fallback: local static image
        const path = `/style-images/${hyphen}.png`;
        return window._getAssetUrl ? window._getAssetUrl(path) : path;
    },

    /**
     * Render a thumbnail for a style tile that fills its container.
     *
     * Image resolution order:
     *   1. /api/style-image/<name>                     — on-demand generation
     *   2. Drive attachment URL (from event cache)
     *
     * The parent container MUST have  position:relative  and a fixed height.
     * All elements render with  position:absolute;inset:0  so overlay gradient
     * divs remain on top correctly.
     */
    _styleThumbHtml(styleName) {
        // Primary: /style-images/ (local static asset)
        const slugHyphen = styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const path = `/style-images/${slugHyphen}.png`;
        const localUrl = window._getAssetUrl ? window._getAssetUrl(path) : path;
        const apiUrl = `/api/style-image/${encodeURIComponent(styleName)}`;

        // Secondary: Drive thumbnail (only works if file is accessible)
        const cached = this._getGridImageUrl(styleName);
        const driveUrl = (cached && !cached.startsWith('/style-images/')) ? cached : '';

        const imgSources = [
            driveUrl,
            localUrl,
            apiUrl
        ].filter(Boolean);

        return `<img src="${this._esc(imgSources[0])}"
                     alt="${this._esc(styleName)}"
                     loading="lazy"
                     data-sources="${this._esc(JSON.stringify(imgSources))}"
                     data-src-idx="0"
                     style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:opacity .35s;opacity:0;"
                     onload="this.style.opacity='1'"
                     onerror="
                        const srcs = JSON.parse(this.dataset.sources || '[]');
                        const next = (this.dataset.srcIdx | 0) + 1;
                        if (next < srcs.length) {
                            this.dataset.srcIdx = next;
                            this.src = srcs[next];
                        } else {
                            this.style.display='none';
                            const fb = this.parentElement && this.parentElement.querySelector('.as-fb');
                            if (fb) fb.style.display='flex';
                        }"
                /><div class="as-fb" style="display:none;position:absolute;inset:0;background:linear-gradient(135deg,#1a1a2e,#2d3561);align-items:center;justify-content:center;">
                    <i class="fas fa-palette" style="font-size:22px;color:rgba(255,255,255,0.18);"></i>
                </div>`;
    },


    // =========================================================================
    // DATA — BY REGION
    // =========================================================================

    // =========================================================================
    // DATA — REORGANIZED (97 STYLES)
    // =========================================================================

    _AS_REGION_DATA: [
        {
            "area": "Classical & Traditional",
            "nick": "Classical & Traditional",
            "icon": "fas fa-landmark",
            "color": "#8b5cf6",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Realism",
                    "name_zh": "现实主义",
                    "hint": "Accurate, detailed representation of subjects"
                },
                {
                    "tier": "Classical",
                    "name": "Impressionism",
                    "name_zh": "印象派",
                    "hint": "Light, movement, visible brushstrokes — Monet"
                },
                {
                    "tier": "Classical",
                    "name": "Renaissance",
                    "name_zh": "复兴",
                    "hint": "Perspective, anatomy, religious/mythological themes"
                },
                {
                    "tier": "Classical",
                    "name": "Baroque",
                    "name_zh": "巴洛克风格",
                    "hint": "Dramatic high-contrast lighting, grand emotional scale"
                },
                {
                    "tier": "Classical",
                    "name": "Romanticism",
                    "name_zh": "浪漫主义",
                    "hint": "Emotion, nature, and the sublime"
                },
                {
                    "tier": "Classical",
                    "name": "Neoclassicism",
                    "name_zh": "新古典主义",
                    "hint": "Greek/Roman revival, order and clarity"
                },
                {
                    "tier": "Classical",
                    "name": "Gothic / Medieval",
                    "name_zh": "哥特式/中世纪",
                    "hint": "Medieval ornate detail, dark tone, stained glass"
                },
                {
                    "tier": "Classical",
                    "name": "Dutch Golden Age",
                    "name_zh": "荷兰黄金时代",
                    "hint": "Vermeer, Rembrandt — rich light, still life mastery"
                },
                {
                    "tier": "Classical",
                    "name": "East Asian Ink",
                    "name_zh": "东亚水墨",
                    "hint": "Sumi-e, Gongbi — delicate brushwork, ink washes"
                },
                {
                    "tier": "Classical",
                    "name": "Ukiyo-e",
                    "name_zh": "浮世绘",
                    "hint": "Japanese woodblock — flat colors, bold outlines, Hokusai"
                },
                {
                    "tier": "Classical",
                    "name": "Mughal / Persian Miniature",
                    "name_zh": "莫卧儿/波斯细密画",
                    "hint": "Jewel-like flatness, gold leaf, court scenes"
                },
                {
                    "tier": "Classical",
                    "name": "Byzantine / Icon",
                    "name_zh": "拜占庭/图标",
                    "hint": "Gold leaf, jewel-like flatness, spiritual intensity"
                },
                {
                    "tier": "Classical",
                    "name": "Indian Miniature",
                    "name_zh": "印度微型",
                    "hint": "Dense detail, rhythmic composition, Rajput/Mughal courts"
                },
                {
                    "tier": "Classical",
                    "name": "Indian Tanjore",
                    "name_zh": "印度坦焦尔",
                    "hint": "Rich gold embossed panels, devotional south Indian art"
                },
                {
                    "tier": "Classical",
                    "name": "Madhubani Art",
                    "name_zh": "马杜巴尼艺术",
                    "hint": "Bihar folk art — intricate patterns, nature, mythology"
                },
                {
                    "tier": "Classical",
                    "name": "Himalayan Thangka",
                    "name_zh": "喜马拉雅唐卡",
                    "hint": "Buddhist scroll painting, symbolic geometry, vivid pigments"
                },
                {
                    "tier": "Classical",
                    "name": "Mexican Muralism",
                    "name_zh": "墨西哥壁画",
                    "hint": "Epic figures, deep social narrative — Rivera, Orozco"
                },
                {
                    "tier": "Classical",
                    "name": "Cuzco School / Baroque-Mestizo",
                    "name_zh": "库斯科学校 / 巴洛克-梅斯蒂索",
                    "hint": "European technique fused with indigenous flora"
                },
                {
                    "tier": "Classical",
                    "name": "Celtic Illuminated",
                    "name_zh": "凯尔特照明",
                    "hint": "Knotwork interlace, gold manuscripts, Book of Kells"
                },
                {
                    "tier": "Classical",
                    "name": "Rococo",
                    "name_zh": "洛可可",
                    "hint": "Pastel elegance, ornate curves, playful aristocratic scenes"
                },
                {
                    "tier": "Classical",
                    "name": "Pre-Raphaelite",
                    "name_zh": "拉斐尔前派",
                    "hint": "Lush detail, medieval romance, botanical precision"
                },
                {
                    "tier": "Classical",
                    "name": "Pointillism",
                    "name_zh": "点画派",
                    "hint": "Seurat — tiny dots of pure color, optical mixing"
                },
                {
                    "tier": "Classical",
                    "name": "Post-Impressionism",
                    "name_zh": "后印象派",
                    "hint": "Cézanne, Van Gogh — structure and emotion beyond Monet"
                },
                {
                    "tier": "Classical",
                    "name": "Symbolism",
                    "name_zh": "象征主义",
                    "hint": "Dreams, myth, metaphor — Klimt, Moreau"
                },
                {
                    "tier": "Classical",
                    "name": "Oil Painting",
                    "name_zh": "油画",
                    "hint": "Rich texture, glazing, old master techniques"
                },
                {
                    "tier": "Classical",
                    "name": "Watercolor",
                    "name_zh": "水彩",
                    "hint": "Soft washes, luminous transparency, organic flow"
                }
            ]
        },
        {
            "area": "Illustrated & Animation",
            "nick": "Illustrated & Animation",
            "icon": "fas fa-pen-nib",
            "color": "#ec4899",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Anime / Manga",
                    "name_zh": "动漫/漫画",
                    "hint": "Large eyes, distinct linework — Ghibli to Cyberpunk"
                },
                {
                    "tier": "Classical",
                    "name": "Comic Book",
                    "name_zh": "漫画书",
                    "hint": "Ben-Day dots, hatching, dynamic linework — Marvel, DC"
                },
                {
                    "tier": "Classical",
                    "name": "Ligne Claire",
                    "name_zh": "莱涅·克莱尔",
                    "hint": "Clean consistent outlines, flat color — Hergé/Tintin"
                },
                {
                    "tier": "Classical",
                    "name": "Golden Age Cartoon",
                    "name_zh": "黄金时代卡通",
                    "hint": "Rubber hose animation, 1930s–50s warmth"
                },
                {
                    "tier": "Classical",
                    "name": "Pixel Art",
                    "name_zh": "像素艺术",
                    "hint": "Retro grid-based digital sprites and scenes"
                },
                {
                    "tier": "Classical",
                    "name": "3D Render / CGI",
                    "name_zh": "3D 渲染/CGI",
                    "hint": "Claymation to hyper-realistic Pixar-style CGI"
                },
                {
                    "tier": "Classical",
                    "name": "Storybook Illustration",
                    "name_zh": "故事书插图",
                    "hint": "Soft watercolor + ink, narrative warmth"
                },
                {
                    "tier": "Classical",
                    "name": "Wayang / Shadow Puppet",
                    "name_zh": "哇扬/皮影",
                    "hint": "Stylized silhouettes, cut-out patterns, Javanese tradition"
                },
                {
                    "tier": "Classical",
                    "name": "Korean Webtoon",
                    "name_zh": "韩国网络漫画",
                    "hint": "Vertical scroll comics, clean digital inking, K-drama vibes"
                },
                {
                    "tier": "Classical",
                    "name": "Graffiti / Street Art",
                    "name_zh": "涂鸦/街头艺术",
                    "hint": "Urban spray paint, lettering, bold imagery"
                },
                {
                    "tier": "Classical",
                    "name": "Flat Illustration",
                    "name_zh": "平面插图",
                    "hint": "Minimal shapes, solid fills, vector editorial style"
                },
                {
                    "tier": "Classical",
                    "name": "Low Poly",
                    "name_zh": "低聚",
                    "hint": "Triangulated facets, geometric simplification"
                }
            ]
        },
        {
            "area": "Abstract & Modernist",
            "nick": "Abstract & Modernist",
            "icon": "fas fa-shapes",
            "color": "#3b82f6",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Minimalism",
                    "name_zh": "极简主义",
                    "hint": "Simple shapes and colors, stripped back to essentials"
                },
                {
                    "tier": "Classical",
                    "name": "Surrealism",
                    "name_zh": "超现实主义",
                    "hint": "Dream-like illogical scenes — Dalí, Magritte"
                },
                {
                    "tier": "Classical",
                    "name": "Pop Art",
                    "name_zh": "波普艺术",
                    "hint": "Bold mass-culture imagery — Warhol, Lichtenstein"
                },
                {
                    "tier": "Classical",
                    "name": "Cubism",
                    "name_zh": "立体主义",
                    "hint": "Geometric fragments, multiple viewpoints — Picasso"
                },
                {
                    "tier": "Classical",
                    "name": "Abstract Expressionism",
                    "name_zh": "抽象表现主义",
                    "hint": "Large-scale emotional color fields — Rothko, Pollock"
                },
                {
                    "tier": "Classical",
                    "name": "Bauhaus",
                    "name_zh": "包豪斯",
                    "hint": "Functional geometry, primary colors, no ornament"
                },
                {
                    "tier": "Classical",
                    "name": "Constructivism",
                    "name_zh": "建构主义",
                    "hint": "Industrial diagonals, red/black/white — Soviet era"
                },
                {
                    "tier": "Classical",
                    "name": "De Stijl",
                    "name_zh": "风格派",
                    "hint": "Grid, primary colors only — Mondrian"
                },
                {
                    "tier": "Classical",
                    "name": "Art Nouveau",
                    "name_zh": "新艺术风格",
                    "hint": "Organic curves, botanical motifs, ornate flow — Klimt"
                },
                {
                    "tier": "Classical",
                    "name": "Art Deco",
                    "name_zh": "装饰艺术",
                    "hint": "Geometric glamour, gold and symmetry, 1920s"
                },
                {
                    "tier": "Classical",
                    "name": "Fauvism",
                    "name_zh": "野兽派",
                    "hint": "Wild, non-naturalistic color — Matisse, Derain"
                },
                {
                    "tier": "Classical",
                    "name": "Expressionism",
                    "name_zh": "表现主义",
                    "hint": "Distorted emotion-first forms — Munch, Kirchner"
                },
                {
                    "tier": "Classical",
                    "name": "Futurism",
                    "name_zh": "未来主义",
                    "hint": "Speed, motion, industrial dynamism — Italian avant-garde"
                },
                {
                    "tier": "Classical",
                    "name": "Brutalism / Constructivist Architecture",
                    "name_zh": "粗野主义/构成主义建筑",
                    "hint": "Raw concrete, monolithic geometry, imposing structure"
                },
                {
                    "tier": "Classical",
                    "name": "Mosaic / Tessellation",
                    "name_zh": "马赛克/镶嵌",
                    "hint": "Fragmented colored tiles, Byzantine to modern"
                },
                {
                    "tier": "Classical",
                    "name": "Origami / Paper Cut",
                    "name_zh": "折纸/剪纸",
                    "hint": "Folded geometric forms, layered paper art"
                }
            ]
        },
        {
            "area": "Atmospheric & Thematic",
            "nick": "Atmospheric & Thematic",
            "icon": "fas fa-cloud-moon",
            "color": "#10b981",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Cyberpunk / Synthwave",
                    "name_zh": "赛博朋克/合成波",
                    "hint": "Neon, futuristic urban decay, high-tech palettes"
                },
                {
                    "tier": "Classical",
                    "name": "Steampunk",
                    "name_zh": "蒸汽朋克",
                    "hint": "Victorian + industrial steam-powered machinery"
                },
                {
                    "tier": "Classical",
                    "name": "Dark Fantasy / Gothic Horror",
                    "name_zh": "黑暗奇幻 / 哥特式恐怖",
                    "hint": "Somber, ornate, eerie dramatic themes"
                },
                {
                    "tier": "Classical",
                    "name": "Ethereal / Whimsical",
                    "name_zh": "空灵/异想天开",
                    "hint": "Soft light, pastel palettes, magical subjects"
                },
                {
                    "tier": "Classical",
                    "name": "Afrofuturism",
                    "name_zh": "非洲未来主义",
                    "hint": "Tribal motifs merged with glowing high-tech"
                },
                {
                    "tier": "Classical",
                    "name": "Solarpunk",
                    "name_zh": "太阳朋克",
                    "hint": "Lush green utopia, organic tech, warm optimism"
                },
                {
                    "tier": "Classical",
                    "name": "Vaporwave",
                    "name_zh": "蒸汽波",
                    "hint": "Pastel grids, retro 80s–90s nostalgia, glitch"
                },
                {
                    "tier": "Classical",
                    "name": "Lo-fi / Cozy",
                    "name_zh": "低保真/舒适",
                    "hint": "Warm grain, soft lighting, everyday comfort"
                },
                {
                    "tier": "Classical",
                    "name": "Biopunk",
                    "name_zh": "生物朋克",
                    "hint": "Organic-tech fusion, biological machinery, wet textures"
                },
                {
                    "tier": "Classical",
                    "name": "Retro Futurism",
                    "name_zh": "复古未来主义",
                    "hint": "1950s vision of tomorrow — space age chrome optimism"
                },
                {
                    "tier": "Classical",
                    "name": "Magical Realism",
                    "name_zh": "魔幻现实主义",
                    "hint": "Mundane scenes infused with mythic surreal wonder"
                },
                {
                    "tier": "Classical",
                    "name": "Noir / Cinematic",
                    "name_zh": "黑色/电影",
                    "hint": "High contrast, moody lighting, dramatic shadows"
                },
                {
                    "tier": "Classical",
                    "name": "Psychedelic",
                    "name_zh": "迷幻的",
                    "hint": "Tame Impala, day-glo swirls, warped reality"
                },
                {
                    "tier": "Classical",
                    "name": "Blueprint / Technical Sketch",
                    "name_zh": "蓝图/技术草图",
                    "hint": "White-on-blue engineering drawings, precise linework"
                }
            ]
        },
        {
            "area": "Regional & Cultural",
            "nick": "Regional & Cultural",
            "icon": "fas fa-globe-americas",
            "color": "#f59e0b",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Aboriginal Dot Art",
                    "name_zh": "原住民点艺术",
                    "hint": "Australian indigenous — dreamtime stories in dot patterns"
                },
                {
                    "tier": "Classical",
                    "name": "Maori Traditional",
                    "name_zh": "毛利传统",
                    "hint": "Ta moko koru spirals, Polynesian wood carving motifs"
                },
                {
                    "tier": "Classical",
                    "name": "Inuit Art",
                    "name_zh": "因纽特艺术",
                    "hint": "Arctic wildlife, carved forms, stark negative space"
                },
                {
                    "tier": "Classical",
                    "name": "African Pattern Art",
                    "name_zh": "非洲图案艺术",
                    "hint": "Kente, Ankara wax print, Ndebele geometric boldness"
                },
                {
                    "tier": "Classical",
                    "name": "Yoruba / Benin Bronze",
                    "name_zh": "约鲁巴/贝宁青铜",
                    "hint": "West African sculptural realism, noble forms, metalwork"
                },
                {
                    "tier": "Classical",
                    "name": "Tingatinga",
                    "name_zh": "廷加廷加",
                    "hint": "East African bright enamel folk painting of animals"
                },
                {
                    "tier": "Classical",
                    "name": "Ethiopian Iconography",
                    "name_zh": "埃塞俄比亚肖像",
                    "hint": "Coptic orthodox saint paintings, flat frontal figures"
                },
                {
                    "tier": "Classical",
                    "name": "Islamic Geometric",
                    "name_zh": "伊斯兰几何",
                    "hint": "Interlocking stars, arabesque calligraphy, zellige tile"
                },
                {
                    "tier": "Classical",
                    "name": "Ottoman Miniature",
                    "name_zh": "奥斯曼微型",
                    "hint": "Iznik ceramics, court scenes, gilded illumination"
                },
                {
                    "tier": "Classical",
                    "name": "Mesopotamian / Assyrian Relief",
                    "name_zh": "美索不达米亚/亚述浮雕",
                    "hint": "Cuneiform-era stone carvings, winged figures, gods"
                },
                {
                    "tier": "Classical",
                    "name": "Indonesian Batik",
                    "name_zh": "印尼蜡染",
                    "hint": "Wax-resist fabric patterns — parang, kawung, mega mendung"
                },
                {
                    "tier": "Classical",
                    "name": "Balinese / Wayang Silk",
                    "name_zh": "巴厘岛/哇扬丝绸",
                    "hint": "Intricate silk weaving, Hindu-Buddhist narrative scenes"
                },
                {
                    "tier": "Classical",
                    "name": "Indian Folk Arts",
                    "name_zh": "印度民间艺术",
                    "hint": "Warli, Gond, Pattachitra, Kalighat — tribal storytelling"
                },
                {
                    "tier": "Classical",
                    "name": "Andean Textile",
                    "name_zh": "安第斯纺织",
                    "hint": "Inca and pre-Columbian woven geometry, earthy tones"
                },
                {
                    "tier": "Classical",
                    "name": "Pre-Columbian / Mesoamerican",
                    "name_zh": "前哥伦布时代/中美洲",
                    "hint": "Mayan codex, Aztec stone relief, jade carvings"
                },
                {
                    "tier": "Classical",
                    "name": "Scandinavian Folk",
                    "name_zh": "斯堪的纳维亚民谣",
                    "hint": "Rosemaling, Kurbits, Norse runestone motifs"
                },
                {
                    "tier": "Classical",
                    "name": "Russian Folk Art",
                    "name_zh": "俄罗斯民间艺术",
                    "hint": "Khokhloma, Gzhel pottery, Palekh lacquer miniatures"
                },
                {
                    "tier": "Classical",
                    "name": "Canadian Indigenous",
                    "name_zh": "加拿大原住民",
                    "hint": "Pacific Northwest totem, woodland beadwork, Inuit soapstone"
                },
                {
                    "tier": "Classical",
                    "name": "Mexican Folk Art",
                    "name_zh": "墨西哥民间艺术",
                    "hint": "Alebrije, Day of the Dead, Talavera, Huichol beadwork"
                },
                {
                    "tier": "Classical",
                    "name": "Vietnamese Lacquer Art",
                    "name_zh": "越南漆艺",
                    "hint": "High-gloss black-and-gold traditional painting technique"
                },
                {
                    "tier": "Classical",
                    "name": "Thai Temple Art",
                    "name_zh": "泰国寺庙艺术",
                    "hint": "Gilded murals, guardian figures, mythological scenes"
                }
            ]
        },
        {
            "area": "Pop Culture & Media",
            "nick": "Pop Culture & Media",
            "icon": "fas fa-film",
            "color": "#ef4444",
            "styles": [
                {
                    "tier": "Classical",
                    "name": "Studio Ghibli",
                    "name_zh": "吉卜力工作室",
                    "hint": "Miyazaki lush watercolor, soft clouds, hand-painted anime"
                },
                {
                    "tier": "Classical",
                    "name": "Pixar / Disney CGI",
                    "name_zh": "皮克斯/迪士尼 CGI",
                    "hint": "Expressive 3D, warm cinematic lighting, subsurface skin"
                },
                {
                    "tier": "Classical",
                    "name": "Disney Hand-Drawn",
                    "name_zh": "迪士尼手绘",
                    "hint": "Clean ink outline, watercolor wash, 1950s fairy tale cel"
                },
                {
                    "tier": "Classical",
                    "name": "Marvel / DC Comics",
                    "name_zh": "漫威/DC漫画",
                    "hint": "Superhero action, bold ink, Ben-Day, Kirby perspective"
                },
                {
                    "tier": "Classical",
                    "name": "LEGO Diorama",
                    "name_zh": "乐高立体模型",
                    "hint": "Colorful plastic bricks, miniature figures, toy photography"
                },
                {
                    "tier": "Classical",
                    "name": "GTA / Rockstar Poster",
                    "name_zh": "GTA / 摇滚明星海报",
                    "hint": "Stylized urban scene, dramatic low angle, saturated art"
                },
                {
                    "tier": "Classical",
                    "name": "Cyberpunk 2077 Concept Art",
                    "name_zh": "赛博朋克 2077 概念艺术",
                    "hint": "Night City neon, chrome implants, CDPR aesthetic"
                },
                {
                    "tier": "Classical",
                    "name": "Norman Rockwell",
                    "name_zh": "诺曼·洛克威尔",
                    "hint": "Nostalgic American narrative illustration, Saturday Evening Post"
                },
                {
                    "tier": "Classical",
                    "name": "Vogue Editorial",
                    "name_zh": "《Vogue》社论",
                    "hint": "High fashion photography meets graphic design sensibility"
                },
                {
                    "tier": "Classical",
                    "name": "Impressionist Oil (Monet)",
                    "name_zh": "印象派油画（莫奈）",
                    "hint": "Water lilies, dappled light, pastel color harmony"
                },
                {
                    "tier": "Classical",
                    "name": "Van Gogh",
                    "name_zh": "梵高",
                    "hint": "Swirling impasto, expressive color, emotional intensity"
                },
                {
                    "tier": "Classical",
                    "name": "Gustav Klimt",
                    "name_zh": "古斯塔夫·克里姆特",
                    "hint": "Gold leaf ornamentation, pattern-filled figuration"
                },
                {
                    "tier": "Classical",
                    "name": "Salvador Dalí",
                    "name_zh": "萨尔瓦多·达利",
                    "hint": "Hyperreal surrealist dreamscapes, melting clocks"
                },
                {
                    "tier": "Classical",
                    "name": "NASA / Space Age",
                    "name_zh": "美国宇航局/太空时代",
                    "hint": "Retro space exploration posters, cosmic cinematics"
                },
                {
                    "tier": "Classical",
                    "name": "SimCity Isometric",
                    "name_zh": "模拟城市等距",
                    "hint": "3D isometric game-style city building view"
                },
                {
                    "tier": "Classical",
                    "name": "Tron Legacy",
                    "name_zh": "创：遗产",
                    "hint": "Neon grid on black, light cycle minimalism"
                }
            ]
        }
    ],
    _AS_TIER_META: {
        "Classical": { "icon": "fas fa-scroll", "color": "#78350f" },
        "Illustrated": { "icon": "fas fa-pen-nib", "color": "#1e40af" },
        "Modernist": { "icon": "fas fa-vector-square", "color": "#4c1d95" }
    },

    _AS_PHIL_DATA: [
        {
            "group": "Classical & Traditional",
            "icon": "fas fa-landmark",
            "color": "#8b5cf6",
            "styles": [
                {
                    "name": "Realism",
                    "hint": "Accurate, detailed representation of subjects"
                },
                {
                    "name": "Impressionism",
                    "hint": "Light, movement, visible brushstrokes — Monet"
                },
                {
                    "name": "Renaissance",
                    "hint": "Perspective, anatomy, religious/mythological themes"
                },
                {
                    "name": "Baroque",
                    "hint": "Dramatic high-contrast lighting, grand emotional scale"
                },
                {
                    "name": "Romanticism",
                    "hint": "Emotion, nature, and the sublime"
                },
                {
                    "name": "Neoclassicism",
                    "hint": "Greek/Roman revival, order and clarity"
                },
                {
                    "name": "Gothic / Medieval",
                    "hint": "Medieval ornate detail, dark tone, stained glass"
                },
                {
                    "name": "Dutch Golden Age",
                    "hint": "Vermeer, Rembrandt — rich light, still life mastery"
                },
                {
                    "name": "East Asian Ink",
                    "hint": "Sumi-e, Gongbi — delicate brushwork, ink washes"
                },
                {
                    "name": "Ukiyo-e",
                    "hint": "Japanese woodblock — flat colors, bold outlines, Hokusai"
                },
                {
                    "name": "Mughal / Persian Miniature",
                    "hint": "Jewel-like flatness, gold leaf, court scenes"
                },
                {
                    "name": "Byzantine / Icon",
                    "hint": "Gold leaf, jewel-like flatness, spiritual intensity"
                },
                {
                    "name": "Indian Miniature",
                    "hint": "Dense detail, rhythmic composition, Rajput/Mughal courts"
                },
                {
                    "name": "Indian Tanjore",
                    "hint": "Rich gold embossed panels, devotional south Indian art"
                },
                {
                    "name": "Madhubani Art",
                    "hint": "Bihar folk art — intricate patterns, nature, mythology"
                },
                {
                    "name": "Himalayan Thangka",
                    "hint": "Buddhist scroll painting, symbolic geometry, vivid pigments"
                },
                {
                    "name": "Mexican Muralism",
                    "hint": "Epic figures, deep social narrative — Rivera, Orozco"
                },
                {
                    "name": "Cuzco School / Baroque-Mestizo",
                    "hint": "European technique fused with indigenous flora"
                },
                {
                    "name": "Celtic Illuminated",
                    "hint": "Knotwork interlace, gold manuscripts, Book of Kells"
                },
                {
                    "name": "Rococo",
                    "hint": "Pastel elegance, ornate curves, playful aristocratic scenes"
                },
                {
                    "name": "Pre-Raphaelite",
                    "hint": "Lush detail, medieval romance, botanical precision"
                },
                {
                    "name": "Pointillism",
                    "hint": "Seurat — tiny dots of pure color, optical mixing"
                },
                {
                    "name": "Post-Impressionism",
                    "hint": "Cézanne, Van Gogh — structure and emotion beyond Monet"
                },
                {
                    "name": "Symbolism",
                    "hint": "Dreams, myth, metaphor — Klimt, Moreau"
                },
                {
                    "name": "Oil Painting",
                    "hint": "Rich texture, glazing, old master techniques"
                },
                {
                    "name": "Watercolor",
                    "hint": "Soft washes, luminous transparency, organic flow"
                }
            ]
        },
        {
            "group": "Illustrated & Animation",
            "icon": "fas fa-pen-nib",
            "color": "#ec4899",
            "styles": [
                {
                    "name": "Anime / Manga",
                    "hint": "Large eyes, distinct linework — Ghibli to Cyberpunk"
                },
                {
                    "name": "Comic Book",
                    "hint": "Ben-Day dots, hatching, dynamic linework — Marvel, DC"
                },
                {
                    "name": "Ligne Claire",
                    "hint": "Clean consistent outlines, flat color — Hergé/Tintin"
                },
                {
                    "name": "Golden Age Cartoon",
                    "hint": "Rubber hose animation, 1930s–50s warmth"
                },
                {
                    "name": "Pixel Art",
                    "hint": "Retro grid-based digital sprites and scenes"
                },
                {
                    "name": "3D Render / CGI",
                    "hint": "Claymation to hyper-realistic Pixar-style CGI"
                },
                {
                    "name": "Storybook Illustration",
                    "hint": "Soft watercolor + ink, narrative warmth"
                },
                {
                    "name": "Wayang / Shadow Puppet",
                    "hint": "Stylized silhouettes, cut-out patterns, Javanese tradition"
                },
                {
                    "name": "Korean Webtoon",
                    "hint": "Vertical scroll comics, clean digital inking, K-drama vibes"
                },
                {
                    "name": "Graffiti / Street Art",
                    "hint": "Urban spray paint, lettering, bold imagery"
                },
                {
                    "name": "Flat Illustration",
                    "hint": "Minimal shapes, solid fills, vector editorial style"
                },
                {
                    "name": "Low Poly",
                    "hint": "Triangulated facets, geometric simplification"
                }
            ]
        },
        {
            "group": "Abstract & Modernist",
            "icon": "fas fa-shapes",
            "color": "#3b82f6",
            "styles": [
                {
                    "name": "Minimalism",
                    "hint": "Simple shapes and colors, stripped back to essentials"
                },
                {
                    "name": "Surrealism",
                    "hint": "Dream-like illogical scenes — Dalí, Magritte"
                },
                {
                    "name": "Pop Art",
                    "hint": "Bold mass-culture imagery — Warhol, Lichtenstein"
                },
                {
                    "name": "Cubism",
                    "hint": "Geometric fragments, multiple viewpoints — Picasso"
                },
                {
                    "name": "Abstract Expressionism",
                    "hint": "Large-scale emotional color fields — Rothko, Pollock"
                },
                {
                    "name": "Bauhaus",
                    "hint": "Functional geometry, primary colors, no ornament"
                },
                {
                    "name": "Constructivism",
                    "hint": "Industrial diagonals, red/black/white — Soviet era"
                },
                {
                    "name": "De Stijl",
                    "hint": "Grid, primary colors only — Mondrian"
                },
                {
                    "name": "Art Nouveau",
                    "hint": "Organic curves, botanical motifs, ornate flow — Klimt"
                },
                {
                    "name": "Art Deco",
                    "hint": "Geometric glamour, gold and symmetry, 1920s"
                },
                {
                    "name": "Fauvism",
                    "hint": "Wild, non-naturalistic color — Matisse, Derain"
                },
                {
                    "name": "Expressionism",
                    "hint": "Distorted emotion-first forms — Munch, Kirchner"
                },
                {
                    "name": "Futurism",
                    "hint": "Speed, motion, industrial dynamism — Italian avant-garde"
                },
                {
                    "name": "Brutalism / Constructivist Architecture",
                    "hint": "Raw concrete, monolithic geometry, imposing structure"
                },
                {
                    "name": "Mosaic / Tessellation",
                    "hint": "Fragmented colored tiles, Byzantine to modern"
                },
                {
                    "name": "Origami / Paper Cut",
                    "hint": "Folded geometric forms, layered paper art"
                }
            ]
        },
        {
            "group": "Atmospheric & Thematic",
            "icon": "fas fa-cloud-moon",
            "color": "#10b981",
            "styles": [
                {
                    "name": "Cyberpunk / Synthwave",
                    "hint": "Neon, futuristic urban decay, high-tech palettes"
                },
                {
                    "name": "Steampunk",
                    "hint": "Victorian + industrial steam-powered machinery"
                },
                {
                    "name": "Dark Fantasy / Gothic Horror",
                    "hint": "Somber, ornate, eerie dramatic themes"
                },
                {
                    "name": "Ethereal / Whimsical",
                    "hint": "Soft light, pastel palettes, magical subjects"
                },
                {
                    "name": "Afrofuturism",
                    "hint": "Tribal motifs merged with glowing high-tech"
                },
                {
                    "name": "Solarpunk",
                    "hint": "Lush green utopia, organic tech, warm optimism"
                },
                {
                    "name": "Vaporwave",
                    "hint": "Pastel grids, retro 80s–90s nostalgia, glitch"
                },
                {
                    "name": "Lo-fi / Cozy",
                    "hint": "Warm grain, soft lighting, everyday comfort"
                },
                {
                    "name": "Biopunk",
                    "hint": "Organic-tech fusion, biological machinery, wet textures"
                },
                {
                    "name": "Retro Futurism",
                    "hint": "1950s vision of tomorrow — space age chrome optimism"
                },
                {
                    "name": "Magical Realism",
                    "hint": "Mundane scenes infused with mythic surreal wonder"
                },
                {
                    "name": "Noir / Cinematic",
                    "hint": "High contrast, moody lighting, dramatic shadows"
                },
                {
                    "name": "Psychedelic",
                    "hint": "Tame Impala, day-glo swirls, warped reality"
                },
                {
                    "name": "Blueprint / Technical Sketch",
                    "hint": "White-on-blue engineering drawings, precise linework"
                }
            ]
        },
        {
            "group": "Regional & Cultural",
            "icon": "fas fa-globe-americas",
            "color": "#f59e0b",
            "styles": [
                {
                    "name": "Aboriginal Dot Art",
                    "hint": "Australian indigenous — dreamtime stories in dot patterns"
                },
                {
                    "name": "Maori Traditional",
                    "hint": "Ta moko koru spirals, Polynesian wood carving motifs"
                },
                {
                    "name": "Inuit Art",
                    "hint": "Arctic wildlife, carved forms, stark negative space"
                },
                {
                    "name": "African Pattern Art",
                    "hint": "Kente, Ankara wax print, Ndebele geometric boldness"
                },
                {
                    "name": "Yoruba / Benin Bronze",
                    "hint": "West African sculptural realism, noble forms, metalwork"
                },
                {
                    "name": "Tingatinga",
                    "hint": "East African bright enamel folk painting of animals"
                },
                {
                    "name": "Ethiopian Iconography",
                    "hint": "Coptic orthodox saint paintings, flat frontal figures"
                },
                {
                    "name": "Islamic Geometric",
                    "hint": "Interlocking stars, arabesque calligraphy, zellige tile"
                },
                {
                    "name": "Ottoman Miniature",
                    "hint": "Iznik ceramics, court scenes, gilded illumination"
                },
                {
                    "name": "Mesopotamian / Assyrian Relief",
                    "hint": "Cuneiform-era stone carvings, winged figures, gods"
                },
                {
                    "name": "Indonesian Batik",
                    "hint": "Wax-resist fabric patterns — parang, kawung, mega mendung"
                },
                {
                    "name": "Balinese / Wayang Silk",
                    "hint": "Intricate silk weaving, Hindu-Buddhist narrative scenes"
                },
                {
                    "name": "Indian Folk Arts",
                    "hint": "Warli, Gond, Pattachitra, Kalighat — tribal storytelling"
                },
                {
                    "name": "Andean Textile",
                    "hint": "Inca and pre-Columbian woven geometry, earthy tones"
                },
                {
                    "name": "Pre-Columbian / Mesoamerican",
                    "hint": "Mayan codex, Aztec stone relief, jade carvings"
                },
                {
                    "name": "Scandinavian Folk",
                    "hint": "Rosemaling, Kurbits, Norse runestone motifs"
                },
                {
                    "name": "Russian Folk Art",
                    "hint": "Khokhloma, Gzhel pottery, Palekh lacquer miniatures"
                },
                {
                    "name": "Canadian Indigenous",
                    "hint": "Pacific Northwest totem, woodland beadwork, Inuit soapstone"
                },
                {
                    "name": "Mexican Folk Art",
                    "hint": "Alebrije, Day of the Dead, Talavera, Huichol beadwork"
                },
                {
                    "name": "Vietnamese Lacquer Art",
                    "hint": "High-gloss black-and-gold traditional painting technique"
                },
                {
                    "name": "Thai Temple Art",
                    "hint": "Gilded murals, guardian figures, mythological scenes"
                }
            ]
        },
        {
            "group": "Pop Culture & Media",
            "icon": "fas fa-film",
            "color": "#ef4444",
            "styles": [
                {
                    "name": "Studio Ghibli",
                    "hint": "Miyazaki lush watercolor, soft clouds, hand-painted anime"
                },
                {
                    "name": "Pixar / Disney CGI",
                    "hint": "Expressive 3D, warm cinematic lighting, subsurface skin"
                },
                {
                    "name": "Disney Hand-Drawn",
                    "hint": "Clean ink outline, watercolor wash, 1950s fairy tale cel"
                },
                {
                    "name": "Marvel / DC Comics",
                    "hint": "Superhero action, bold ink, Ben-Day, Kirby perspective"
                },
                {
                    "name": "LEGO Diorama",
                    "hint": "Colorful plastic bricks, miniature figures, toy photography"
                },
                {
                    "name": "GTA / Rockstar Poster",
                    "hint": "Stylized urban scene, dramatic low angle, saturated art"
                },
                {
                    "name": "Cyberpunk 2077 Concept Art",
                    "hint": "Night City neon, chrome implants, CDPR aesthetic"
                },
                {
                    "name": "Norman Rockwell",
                    "hint": "Nostalgic American narrative illustration, Saturday Evening Post"
                },
                {
                    "name": "Vogue Editorial",
                    "hint": "High fashion photography meets graphic design sensibility"
                },
                {
                    "name": "Impressionist Oil (Monet)",
                    "hint": "Water lilies, dappled light, pastel color harmony"
                },
                {
                    "name": "Van Gogh",
                    "hint": "Swirling impasto, expressive color, emotional intensity"
                },
                {
                    "name": "Gustav Klimt",
                    "hint": "Gold leaf ornamentation, pattern-filled figuration"
                },
                {
                    "name": "Salvador Dalí",
                    "hint": "Hyperreal surrealist dreamscapes, melting clocks"
                },
                {
                    "name": "NASA / Space Age",
                    "hint": "Retro space exploration posters, cosmic cinematics"
                },
                {
                    "name": "SimCity Isometric",
                    "hint": "3D isometric game-style city building view"
                },
                {
                    "name": "Tron Legacy",
                    "hint": "Neon grid on black, light cycle minimalism"
                }
            ]
        }
    ],
    __htpCache: {},

    async initStyles() {
        // Data is now inlined for performance and simplicity
        if (typeof this._syncFilterSectionsToHash === 'function') {
            this._syncFilterSectionsToHash();
        }
    },


    // =========================================================================
    // TAB SWITCHER
    // =========================================================================

    switchArtStyleTab(tab) {
        this._artStyleTab = tab;
        // Rebuild cache when switching tabs in case new events loaded since last render
        this._buildArtStyleImageCache();

        const rBtn = document.getElementById('artstyle-tab-region');
        const pBtn = document.getElementById('artstyle-tab-phil');
        if (!rBtn || !pBtn) return;

        const activeStyle = 'background:#e7f3ff;color:#0078d4;border-bottom:2px solid #0078d4;';
        const inactiveStyle = 'background:transparent;color:#888;border-bottom:2px solid transparent;';

        rBtn.style.cssText += tab === 'region' ? activeStyle : inactiveStyle;
        pBtn.style.cssText += tab === 'phil' ? activeStyle : inactiveStyle;

        this.renderArtStyleTree();
    },

    // =========================================================================
    // RENDER — DISPATCHER
    // =========================================================================

    renderArtStyleTree() {
        const container = document.getElementById('tag-artstyle-tree');
        if (!container) return;

        // Rebuild image cache each render so newly-loaded events appear
        this._buildArtStyleImageCache();

        if (!this._artStyleExp) this._artStyleExp = {};
        if (!this._artStyleTab) this._artStyleTab = 'region';

        const tab = this._artStyleTab;
        container.innerHTML = tab === 'region'
            ? this._renderRegionTree()
            : this._renderPhilTree();
    },

    // =========================================================================
    // RENDER — BY REGION
    // =========================================================================

    _renderRegionTree() {
        const cur = this.state?.calendar?.videoTagsFilter?.artStyle || 'all';
        const isActive = v => cur === v;

        const rowStyle = (active, depth) => [
            'display:flex', 'align-items:center', 'gap:4px',
            `padding:3px 6px 3px ${6 + depth * 13}px`,
            'cursor:pointer', 'border-bottom:1px solid #f0f0f0',
            `background:${active ? '#e7f3ff' : 'transparent'}`,
            `font-weight:${depth === 0 ? '600' : 'normal'}`,
            `color:${active ? '#0078d4' : '#555'}`,
            `font-size:${depth >= 2 ? '10.5px' : '11px'}`,
        ].join(';');

        const chev = key => {
            const exp = !!this._artStyleExp[key];
            return `<i class="fas fa-chevron-${exp ? 'down' : 'right'}"
                style="font-size:8px;color:#aaa;min-width:10px;"
                onclick="event.stopPropagation();App._toggleAS('${this._esc(key)}')"></i>`;
        };
        const gap = `<span style="min-width:10px;display:inline-block;"></span>`;

        let html = '';

        // "All" row
        const allAct = isActive('all');
        html += `<div onclick="App._onArtStyleClick('all')" style="${rowStyle(allAct, 0)}"
            onmouseenter="if(!${allAct})this.style.background='#f5f8ff'"
            onmouseleave="if(!${allAct})this.style.background='transparent'">
            ${gap}<i class="fas fa-layer-group" style="font-size:9px;color:${allAct ? '#0078d4' : '#888'};"></i>
            <span style="flex:1;">All Regions</span>
        </div>`;

        this._AS_REGION_DATA.forEach(({ area, nick, icon, color, styles }) => {
            const aVal = `r:area:${area}`;
            const aAct = isActive(aVal);
            const aKey = `r:a:${area}`;
            const aExp = !!this._artStyleExp[aKey];

            // Collect one representative image for this area (first style found)
            const areaThumbUrl = styles.reduce((found, s) => found || this._getGridImageUrl(s.name), '');
            const areaThumbHtml = areaThumbUrl
                ? `<img src="${areaThumbUrl}" loading="lazy" style="width:24px;height:18px;object-fit:cover;border-radius:2px;flex-shrink:0;opacity:0;transition:opacity .3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'">`
                : '';

            html += `<div onclick="App._onArtStyleClick('${this._esc(aVal)}')" style="${rowStyle(aAct, 0)}"
                onmouseenter="if(!${aAct})this.style.background='#f5f8ff'"
                onmouseleave="if(!${aAct})this.style.background='transparent'">
                ${chev(aKey)}
                ${areaThumbHtml || `<i class="${icon}" style="font-size:9px;color:${aAct ? '#0078d4' : color};"></i>`}
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${this._esc(area)}
                    <span style="font-weight:400;color:#bbb;font-size:9px;margin-left:3px;">${this._esc(nick)}</span>
                </span>
            </div>`;

            if (!aExp) return;

            ['Classical', 'Illustrated', 'Modernist'].forEach(tier => {
                const tierStyles = styles.filter(s => s.tier === tier);
                if (!tierStyles.length) return;

                const tVal = `r:tier:${area}:${tier}`;
                const tAct = isActive(tVal);
                const tKey = `r:t:${area}:${tier}`;
                const tExp = !!this._artStyleExp[tKey];
                const tm = this._AS_TIER_META[tier];

                // Tier representative image
                const tierThumbUrl = tierStyles.reduce((f, s) => f || this._getGridImageUrl(s.name), '');
                const tierThumbHtml = tierThumbUrl
                    ? `<img src="${tierThumbUrl}" loading="lazy" style="width:22px;height:16px;object-fit:cover;border-radius:2px;flex-shrink:0;opacity:0;transition:opacity .3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'">`
                    : `<i class="${tm.icon}" style="font-size:8px;color:${tAct ? '#0078d4' : tm.color};"></i>`;

                html += `<div onclick="App._onArtStyleClick('${this._esc(tVal)}')" style="${rowStyle(tAct, 1)}"
                    onmouseenter="if(!${tAct})this.style.background='#f5f8ff'"
                    onmouseleave="if(!${tAct})this.style.background='transparent'">
                    ${chev(tKey)}
                    ${tierThumbHtml}
                    <span style="flex:1;">${tier}</span>
                    <span style="font-size:9px;color:#ccc;margin-right:4px;">${tierStyles.length}</span>
                </div>`;

                if (!tExp) return;

                tierStyles.forEach(s => {
                    const lVal = `r:style:${area}:${tier}:${s.name}`;
                    const lAct = isActive(lVal);
                    const styleThumbUrl = this._getGridImageUrl(s.name);

                    const styleImgHtml = styleThumbUrl
                        ? `<img src="${styleThumbUrl}" loading="lazy" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0;opacity:0;transition:opacity .3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'">`
                        : `<i class="fas fa-circle" style="font-size:4px;color:${lAct ? '#0078d4' : '#ccc'};min-width:8px;"></i>`;

                    html += `<div onclick="App._onArtStyleClick('${this._esc(lVal)}')" style="${rowStyle(lAct, 2)}"
                        onmouseenter="if(!${lAct})this.style.background='#f5f8ff'"
                        onmouseleave="if(!${lAct})this.style.background='transparent'">
                        ${gap}
                        ${styleImgHtml}
                        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${this._esc(s.hint)}">
                            ${this._esc(s.name)}
                        </span>
                    </div>`;
                });
            });
        });

        return html;
    },

    // =========================================================================
    // RENDER — BY PHILOSOPHY
    // =========================================================================

    _renderPhilTree() {
        const cur = this.state?.calendar?.videoTagsFilter?.artStyle || 'all';
        const isActive = v => cur === v;

        const rowStyle = (active, depth) => [
            'display:flex', 'align-items:center', 'gap:4px',
            `padding:3px 6px 3px ${6 + depth * 13}px`,
            'cursor:pointer', 'border-bottom:1px solid #f0f0f0',
            `background:${active ? '#e7f3ff' : 'transparent'}`,
            `font-weight:${depth === 0 ? '600' : 'normal'}`,
            `color:${active ? '#0078d4' : '#555'}`,
            `font-size:${depth >= 1 ? '10.5px' : '11px'}`,
        ].join(';');

        const chev = key => {
            const exp = !!this._artStyleExp[key];
            return `<i class="fas fa-chevron-${exp ? 'down' : 'right'}"
                style="font-size:8px;color:#aaa;min-width:10px;"
                onclick="event.stopPropagation();App._toggleAS('${this._esc(key)}')"></i>`;
        };
        const gap = `<span style="min-width:10px;display:inline-block;"></span>`;

        let html = '';

        // "All" row
        const allAct = isActive('all_philosophies');
        html += `<div onclick="App._onArtStyleClick('all_philosophies')" style="${rowStyle(allAct, 0)}"
            onmouseenter="if(!${allAct})this.style.background='#f5f8ff'"
            onmouseleave="if(!${allAct})this.style.background='transparent'">
            ${gap}<i class="fas fa-layer-group" style="font-size:9px;color:${allAct ? '#0078d4' : '#888'};"></i>
            <span style="flex:1;">All Philosophies</span>
        </div>`;

        this._AS_PHIL_DATA.forEach(({ group, icon, color, styles }) => {
            const gVal = `p:group:${group}`;
            const gAct = isActive(gVal);
            const gKey = `p:g:${group}`;
            const gExp = !!this._artStyleExp[gKey];

            // Group representative image from first matching style
            const groupThumbUrl = styles.reduce((f, s) => f || this._getGridImageUrl(s.name), '');
            const groupThumbHtml = groupThumbUrl
                ? `<img src="${groupThumbUrl}" loading="lazy" style="width:22px;height:16px;object-fit:cover;border-radius:2px;flex-shrink:0;opacity:0;transition:opacity .3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'">`
                : `<i class="${icon}" style="font-size:9px;color:${gAct ? '#0078d4' : color};"></i>`;

            html += `<div onclick="App._onArtStyleClick('${this._esc(gVal)}')" style="${rowStyle(gAct, 0)}"
                onmouseenter="if(!${gAct})this.style.background='#f5f8ff'"
                onmouseleave="if(!${gAct})this.style.background='transparent'">
                ${chev(gKey)}
                ${groupThumbHtml}
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this._esc(group)}</span>
                <span style="font-size:9px;color:#ccc;margin-right:4px;">${styles.length}</span>
            </div>`;

            if (!gExp) return;

            styles.forEach(s => {
                const lVal = `p:style:${group}:${s.name}`;
                const lAct = isActive(lVal);
                const styleThumbUrl = this._getGridImageUrl(s.name);

                const styleImgHtml = styleThumbUrl
                    ? `<img src="${styleThumbUrl}" loading="lazy" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0;opacity:0;transition:opacity .3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'">`
                    : `<i class="fas fa-circle" style="font-size:4px;color:${lAct ? '#0078d4' : '#ccc'};min-width:8px;"></i>`;

                html += `<div onclick="App._onArtStyleClick('${this._esc(lVal)}')" style="${rowStyle(lAct, 1)}"
                    onmouseenter="if(!${lAct})this.style.background='#f5f8ff'"
                    onmouseleave="if(!${lAct})this.style.background='transparent'">
                    ${gap}
                    ${styleImgHtml}
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${this._esc(s.hint)}">
                        ${this._esc(s.name)}
                    </span>
                </div>`;
            });
        });

        return html;
    },

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    _onArtStyleClick(val) {
        if (!this.state?.calendar?.videoTagsFilter) return;
        const cur = this.state.calendar.videoTagsFilter.artStyle || 'all';
        this.state.calendar.videoTagsFilter.artStyle = (cur === val) ? 'all' : val;

        if (val !== 'all') {
            let key = null;
            if (val.startsWith('r:area:')) key = 'r:a:' + val.slice(7);
            else if (val.startsWith('r:tier:')) key = 'r:t:' + val.slice(7);
            else if (val.startsWith('p:group:')) key = 'p:g:' + val.slice(8);
            if (key) {
                if (!this._artStyleExp) this._artStyleExp = {};
                this._artStyleExp[key] = true;
            }

            // Auto-close Type Filters when an art style is selected
            const typeBody = document.getElementById('tag-type-body');
            const typeChev = document.getElementById('tag-type-chev');
            if (typeBody && typeBody.style.display !== 'none') {
                typeBody.style.display = 'none';
                if (typeChev) typeChev.style.transform = 'rotate(-90deg)';
            }
        }

        this._syncArtStyleFilterToHash();
        this.renderArtStyleTree();
        setTimeout(() => this.renderCalendar?.(), 50);
    },

    _slugToArtStyleFilter(slug) {
        if (!slug || !slug.startsWith('artstyle-')) return null;
        const target = slug.slice(9);

        if (target === 'all-philosophies') return 'all_philosophies';

        const toSlug = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 1. Exact matches against _AS_REGION_DATA
        if (this._AS_REGION_DATA) {
            for (const r of this._AS_REGION_DATA) {
                if (toSlug(r.area) === target) return `r:area:${r.area}`;
                const tiers = ['Classical', 'Illustrated', 'Modernist'];
                for (const t of tiers) {
                    if (toSlug(`${r.area}-${t}`) === target) return `r:tier:${r.area}:${t}`;
                    const styleMatches = r.styles.filter(s => s.tier === t);
                    for (const s of styleMatches) {
                        if (toSlug(`${r.area}-${t}-${s.name}`) === target) return `r:style:${r.area}:${t}:${s.name}`;
                    }
                }
            }
        }

        // 2. Exact matches against _AS_PHIL_DATA
        if (this._AS_PHIL_DATA) {
            for (const p of this._AS_PHIL_DATA) {
                if (toSlug(p.group) === target) return `p:group:${p.group}`;
                for (const s of p.styles) {
                    if (toSlug(`${p.group}-${s.name}`) === target) return `p:style:${p.group}:${s.name}`;
                }
            }
        }

        // 3. Legacy dynamic-styles- prefix (redirect to real group)
        let styleSlugToResolve = null;
        if (target.startsWith('dynamic-styles-')) {
            styleSlugToResolve = target.slice(15);
        }

        // 4. Group-prefix matching: decompose "{group-slug}-{style-slug}"
        //    e.g. "atmospheric--thematic-han-dynasty-mural" → group="Atmospheric & Thematic", style="Han Dynasty Mural"
        if (!styleSlugToResolve && this._AS_PHIL_DATA) {
            for (const p of this._AS_PHIL_DATA) {
                const groupSlug = toSlug(p.group);
                if (target.startsWith(groupSlug + '-')) {
                    styleSlugToResolve = target.slice(groupSlug.length + 1);
                    // If found in this group, resolve immediately
                    const styleNameGuess = styleSlugToResolve.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    // Check if style already exists in this group
                    const existing = p.styles.find(s => toSlug(s.name) === styleSlugToResolve);
                    if (existing) return `p:style:${p.group}:${existing.name}`;
                    // Auto-inject into this group
                    if (!p.styles.find(s => s.name.toLowerCase() === styleNameGuess.toLowerCase())) {
                        p.styles.push({ name: styleNameGuess, hint: styleNameGuess });
                    }
                    return `p:style:${p.group}:${styleNameGuess}`;
                }
            }
        }

        // 5. Fallback for unresolved dynamic-styles slugs
        if (styleSlugToResolve) {
            const styleNameGuess = styleSlugToResolve.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const philMap = this._getHashtagToPhil ? this._getHashtagToPhil() : {};
            const slugKey = styleSlugToResolve.replace(/-/g, '_');
            const mapped = philMap[styleSlugToResolve] || philMap[slugKey] || philMap[styleNameGuess.toLowerCase()];
            if (mapped) return `p:style:${mapped.group}:${mapped.style}`;

            const fallbackGroup = 'Atmospheric & Thematic';
            if (this._AS_PHIL_DATA) {
                const grp = this._AS_PHIL_DATA.find(g => g.group === fallbackGroup);
                if (grp && !grp.styles.find(s => s.name.toLowerCase() === styleNameGuess.toLowerCase())) {
                    grp.styles.push({ name: styleNameGuess, hint: styleNameGuess });
                }
            }
            return `p:style:${fallbackGroup}:${styleNameGuess}`;
        }

        return null;
    },

    /** Async auto-translate a style name to Chinese via Google Translate and update the hint */
    _autoTranslateStyleHint(styleEntry, englishName) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(englishName)}`;
        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data && data[0]) {
                    const zh = data[0].map(item => item[0]).join('').trim();
                    if (zh && zh !== englishName) {
                        const oldHint = styleEntry.hint || '';
                        const hasChinese = /[\u4e00-\u9fa5]/.test(oldHint);
                        if (!hasChinese) {
                            styleEntry.hint = oldHint && oldHint !== englishName
                                ? `${zh} | ${oldHint}`
                                : zh;
                            // Update any visible hint element in the UI
                            document.querySelectorAll('.as-style-hint').forEach(el => {
                                if (el.closest('[data-style]')?.dataset.style === englishName) {
                                    el.textContent = styleEntry.hint;
                                }
                            });
                        }
                    }
                }
            })
            .catch(() => { /* silently ignore translation errors */ });
    },

    _syncArtStyleFilterToHash() {
        const artStyle = this.state.calendar?.videoTagsFilter?.artStyle;
        if (!artStyle || artStyle === 'all') {
            if (typeof this._syncLocationFilterToHash === 'function') {
                this._syncLocationFilterToHash();
            } else if (window.location.hash.startsWith('#artstyle-')) {
                window.location.hash = 'calendar';
            }
            return;
        }

        if (artStyle === 'all_philosophies') {
            window.location.hash = 'artstyle-all-philosophies';
            return;
        }

        const parts = artStyle.split(':');
        const slug = parts.slice(2).join('-')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        window.location.hash = `artstyle-${slug}`;
    },

    _getArtStyleDisplayLabel(val) {
        if (!val || val === 'all') return null;
        const parts = val.split(':');
        if (parts[1] === 'style') return parts[parts.length - 1];
        if (parts[1] === 'tier') return parts[parts.length - 1];
        if (parts[1] === 'area') return parts[2];
        if (parts[1] === 'group') return parts[2];
        return val;
    },

    _artStyleSubgroupLabel(ev, filterVal) {
        if (!filterVal || filterVal === 'all') return null;

        if (filterVal.startsWith('r:area:')) {
            const tags = this._parseArtStyleTags(ev);
            return tags.tier || 'Other';
        }
        if (filterVal.startsWith('r:tier:')) {
            const tags = this._parseArtStyleTags(ev);
            return tags.style || 'Other';
        }
        if (filterVal.startsWith('r:style:')) return null;

        if (filterVal.startsWith('p:group:')) {
            const tags = this._parseArtPhilTags(ev);
            return tags.style || 'Other';
        }
        if (filterVal.startsWith('p:style:')) return null;

        return null;
    },

    _toggleAS(key) {
        if (!this._artStyleExp) this._artStyleExp = {};
        this._artStyleExp[key] = !this._artStyleExp[key];
        this.renderArtStyleTree();
    },

    // =========================================================================
    // FILTER MATCHING
    // =========================================================================

    _artStyleMatchesFilter(ev, filterVal) {
        if (!filterVal || filterVal === 'all') return true;

        if (filterVal.startsWith('r:')) {
            const tags = this._parseArtStyleTags(ev);
            if (filterVal.startsWith('r:area:')) {
                return tags.area === filterVal.slice(7);
            }
            if (filterVal.startsWith('r:tier:')) {
                const rest = filterVal.slice(7);
                const sep = rest.lastIndexOf(':');
                return tags.area === rest.slice(0, sep) && tags.tier === rest.slice(sep + 1);
            }
            if (filterVal.startsWith('r:style:')) {
                const parts = filterVal.slice(8).split(':');
                return tags.area === parts[0] && tags.tier === parts[1] && tags.style === parts.slice(2).join(':');
            }
        }

        if (filterVal.startsWith('p:')) {
            const allTags = this._parseArtPhilTagsAll ? this._parseArtPhilTagsAll(ev) : [];
            if (filterVal.startsWith('p:group:')) {
                const groupTarget = filterVal.slice(8);
                return allTags.some(t => t.group === groupTarget);
            }
            if (filterVal.startsWith('p:style:')) {
                const rest = filterVal.slice(8);
                const sep = rest.indexOf(':');
                const groupTarget = rest.slice(0, sep);
                const styleTarget = rest.slice(sep + 1);
                return allTags.some(t => t.group === groupTarget && t.style === styleTarget);
            }
        }

        return false;
    },

    _parseArtStyleTags(ev) {
        const desc = ev.description || ev._rawItem?.description || '';
        const ep = ev.extendedProperties?.private || ev._rawItem?.extendedProperties?.private || {};
        if (ep.artArea || ep.artTier || ep.artStyle) {
            return { area: ep.artArea || null, tier: ep.artTier || null, style: ep.artStyle || null };
        }
        return {
            area: (desc.match(/#ArtArea:\s*([^\n#]+)/i) || [])[1]?.trim() || null,
            tier: (desc.match(/#ArtTier:\s*([^\n#]+)/i) || [])[1]?.trim() || null,
            style: (desc.match(/#ArtStyle:\s*([^\n#]+)/i) || [])[1]?.trim() || null,
        };
    },

    _getHashtagToPhil() {
        if (this.__htpCache && Object.keys(this.__htpCache).length > 0) {
            return this.__htpCache;
        }

        // Build the hashtag → { group, style } map from _AS_PHIL_DATA
        const cache = {};
        const data = this._AS_PHIL_DATA || [];
        for (const grp of data) {
            if (!grp.styles) continue;
            for (const s of grp.styles) {
                const name = s.name;
                const entry = { group: grp.group, style: name };

                // Generate multiple slug variants for robust matching
                const lower = name.toLowerCase();
                const under = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                const hyphen = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const nospace = lower.replace(/[^a-z0-9]/g, '');

                // Map all variants
                if (!cache[under]) cache[under] = entry;
                if (!cache[hyphen]) cache[hyphen] = entry;
                if (!cache[nospace]) cache[nospace] = entry;
                if (!cache[lower]) cache[lower] = entry;

                // Note: first-word matching removed — too aggressive, causes false matches
                // (e.g., "dark" from unrelated tags → "Dark Fantasy / Gothic Horror")
            }
        }

        this.__htpCache = cache;
        return cache;
    },

    _parseArtPhilTagsAll(ev) {
        if (!ev) return [];
        const desc = ev.description || ev._rawItem?.description || ev.bodyHtml?.replace(/<[^>]+>/g, ' ') || '';
        const ep = ev.extendedProperties?.private || ev._rawItem?.extendedProperties?.private || {};

        // 1. Structured extended properties (highest priority)
        if (ep.artGroup || ep.artPhil) {
            return [{ group: ep.artGroup || null, style: ep.artPhil || null }];
        }

        // 2. Structured inline tags
        const structGroup = (desc.match(/#ArtGroup:\s*([^\n#]+)/i) || [])[1]?.trim();
        const structStyle = (desc.match(/#ArtPhil:\s*([^\n#]+)/i) || [])[1]?.trim();
        if (structGroup || structStyle) {
            return [{ group: structGroup || null, style: structStyle || null }];
        }

        const explicitArtTags = new Set();
        const hashtags = [];

        // 3a. Extract explicitly marked art tags from the description
        const artTagsMatch = desc.match(/--\s*ART TAGS\s*---([\s\S]*?)(?:--|$)/i);
        if (artTagsMatch) {
            const section = artTagsMatch[1];
            const tags = [...section.matchAll(/#([a-zA-Z0-9_]+)/g)].map(m => m[1].toLowerCase());
            tags.forEach(t => explicitArtTags.add(t));
        }

        // 3b. Free-form hashtag fallback — scan all #tags in the description
        const allDescTags = [...desc.matchAll(/#([a-zA-Z0-9_]+)/g)].map(m => m[1].toLowerCase());
        hashtags.push(...allDescTags);

        // 4. Infer from image attachment filenames (e.g., cyberpunk.png -> cyberpunk)
        const attachments = ev.attachments || ev._rawItem?.attachments || [];
        for (const att of attachments) {
            const title = (att.title || '').toLowerCase();
            if (title.match(/\.(png|jpe?g|webp|gif)$/i)) {
                let slug = title.slice(0, title.lastIndexOf('.'));
                if (slug.startsWith('grid_')) slug = slug.slice(5);
                slug = slug.replace(/-/g, '_').replace(/[^a-z0-9_]/g, ''); // Convert hyphens to underscores for matching
                // Skip layout/format variants — not art style names
                if (/^(3x3|916)/.test(slug)) continue;
                explicitArtTags.add(slug);
                hashtags.push(slug);
            }
        }

        if (!hashtags.length) return [];

        const philMap = this._getHashtagToPhil ? this._getHashtagToPhil() : {};
        const matched = [];
        const seen = new Set();

        for (const tag of hashtags) {
            let mapped = philMap[tag];
            // Exact match only — substring fallback removed (caused false positives)

            if (mapped) {
                const key = `${mapped.group}::${mapped.style}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    matched.push({ group: mapped.group, style: mapped.style, tag });
                }
            } else if (explicitArtTags.has(tag)) {
                // Map unrecognized explicit tags into the best existing group
                const formatName = (str) => str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const styleName = formatName(tag);

                // Try fuzzy match into existing groups
                let bestGroup = 'Atmospheric & Thematic'; // default catch-all
                const allPhilGroups = this._AS_PHIL_DATA || [];
                for (const grp of allPhilGroups) {
                    const found = (grp.styles || []).find(s =>
                        s.name.toLowerCase() === styleName.toLowerCase() ||
                        s.name.toLowerCase().includes(tag) ||
                        tag.includes(s.name.toLowerCase().split(/[\s\/]+/)[0])
                    );
                    if (found) { bestGroup = grp.group; break; }
                }

                const key = `${bestGroup}::${styleName}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    matched.push({ group: bestGroup, style: styleName, tag });

                    // Inject into the appropriate existing group
                    const grp = allPhilGroups.find(g => g.group === bestGroup);
                    if (grp && !grp.styles.find(s => s.name === styleName)) {
                        grp.styles.push({ name: styleName, hint: 'Auto-discovered from event' });
                    }
                }
            }
        }
        return matched;
    },

    _parseArtPhilTags(ev) {
        const all = this._parseArtPhilTagsAll(ev);
        return all.length > 0 ? all[0] : { group: null, style: null };
    },

    _getEventArtStyleThumbUrl(ev) {
        if (!ev) return null;
        const allTags = this._parseArtPhilTagsAll(ev);
        if (!allTags || allTags.length === 0) return null;

        const filterVal = this.state?.calendar?.videoTagsFilter?.artStyle;
        let styleName = allTags[0].style;

        if (filterVal && filterVal.startsWith('p:style:')) {
            const rest = filterVal.slice(8);
            const sep = rest.indexOf(':');
            const group = rest.slice(0, sep);
            const style = rest.slice(sep + 1);
            const match = allTags.find(t => t.group === group && t.style === style);
            if (match) styleName = match.style;
        }

        if (!styleName) return null;

        // ── Priority 1: grid image from THIS event's own attachments ──────────
        const rawEv = ev._rawItem || ev;
        const attachments = rawEv.attachments || [];
        const styleSlug = styleName.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const styleSlugHyphen = styleSlug.replace(/_/g, '-');

        for (const att of attachments) {
            const title = (att.title || '').toLowerCase();
            if (!title.match(/\.(png|jpe?g|webp|gif)$/i)) continue;
            let attSlug = title.slice(0, title.lastIndexOf('.'));
            if (attSlug.startsWith('grid_')) attSlug = attSlug.slice(5);
            if (attSlug === styleSlug || attSlug === styleSlugHyphen ||
                styleSlug.includes(attSlug) || attSlug.includes(styleSlug.split('_')[0])) {
                const rawUrl = att.fileUrl || '';
                const idMatch = rawUrl.match(/\/d\/([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/id=([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/\/file\/d\/([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/\/open\?id=([A-Za-z0-9_-]+)/)
                    || rawUrl.match(/\/uc\?id=([A-Za-z0-9_-]+)/);
                const fileId = att.fileId || (idMatch ? idMatch[1] : '');
                if (fileId) {
                    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
                }
            }
        }

        // ── Priority 2: global cache from any event ────────────────────────────
        if (!this._artStyleImageCache) this._buildArtStyleImageCache();
        const cached = this._getGridImageUrl(styleName);
        if (cached) return cached;

        // ── Priority 3: local static image fallback ────────────────────────────
        return `/style-images/${styleSlugHyphen}.png`;
    },


    // =========================================================================
    // BANNER HELPER  (used by renderTagThumbnailView in calendar-tag-filters.js)
    // =========================================================================

    _buildArtStyleBanner(artStyleF) {
        if (!artStyleF || artStyleF === 'all') return '';

        // Ensure cache is fresh
        if (!this._artStyleImageCache) this._buildArtStyleImageCache();

        if (artStyleF.startsWith('r:area:')) {
            const areaName = artStyleF.slice(7);
            const areaData = this._AS_REGION_DATA?.find(r => r.area === areaName);
            const tiers = ['Classical', 'Illustrated', 'Modernist'];
            const tilesHtml = tiers.map(tier => {
                const s = areaData?.styles.find(st => st.tier === tier);
                if (!s) return '';
                const clickVal = `r:tier:${areaName}:${tier}`;
                const tm = this._AS_TIER_META?.[tier] || {};
                return `<div onclick="App._onArtStyleClick('${this._esc(clickVal)}')"
                         style="flex:1;min-width:0;border-radius:6px;overflow:hidden;position:relative;height:130px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;background:#1a1a2e;"
                         onmouseenter="this.style.borderColor='#0078d4'" onmouseleave="this.style.borderColor='transparent'">
                        ${this._styleThumbHtml(s.name)}
                        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 8px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.78));pointer-events:none;">
                            <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.8px;margin-bottom:1px;">${tier}</div>
                            <div style="font-size:11px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.name)}</div>
                            <div style="font-size:9px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.hint || '')}</div>
                        </div>
                    </div>`;
            }).join('');
            return `<div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="${areaData?.icon || 'fas fa-map-marker-alt'}" style="color:${areaData?.color || '#0078d4'};font-size:13px;"></i>
                    <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${this.escape(areaName)}</span>
                    <span style="font-size:11px;color:#aaa;">${areaData ? this.escape(areaData.nick) : ''}</span>
                    <button onclick="App.openArtStyleSlideshowFromFilter()" style="margin-left:auto;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-images" style="font-size:10px;"></i> Slideshow</button>
<button onclick="App.generateVideoFromFilter()" style="margin-left:10px;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-video" style="font-size:10px;"></i> Generate Video</button>
                </div>
                <div style="display:flex;gap:8px;">${tilesHtml}</div>
            </div>`;

        } else if (artStyleF.startsWith('r:tier:')) {
            const rest = artStyleF.slice(7);
            const sep = rest.lastIndexOf(':');
            const areaName = rest.slice(0, sep);
            const tier = rest.slice(sep + 1);
            const areaData = this._AS_REGION_DATA?.find(r => r.area === areaName);
            const tm = this._AS_TIER_META?.[tier] || {};
            const tilesHtml = (areaData?.styles.filter(s => s.tier === tier) || []).map(s => {
                const clickVal = `r:style:${areaName}:${tier}:${s.name}`;
                return `<div onclick="App._onArtStyleClick('${this._esc(clickVal)}')"
                         style="flex:1;min-width:0;border-radius:6px;overflow:hidden;position:relative;height:130px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;background:#1a1a2e;"
                         onmouseenter="this.style.borderColor='#0078d4'" onmouseleave="this.style.borderColor='transparent'">
                        ${this._styleThumbHtml(s.name)}
                        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 8px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.78));pointer-events:none;">
                            <div style="font-size:12px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.name)}</div>
                            <div style="font-size:10px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.hint || '')}</div>
                        </div>
                    </div>`;
            }).join('');
            return `<div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="${tm.icon || 'fas fa-scroll'}" style="color:${tm.color || '#888'};font-size:13px;"></i>
                    <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${this.escape(tier)} — ${this.escape(areaName)}</span>
                    <button onclick="App.openArtStyleSlideshowFromFilter()" style="margin-left:auto;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-images" style="font-size:10px;"></i> Slideshow</button>
<button onclick="App.generateVideoFromFilter()" style="margin-left:10px;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-video" style="font-size:10px;"></i> Generate Video</button>
                </div>
                <div style="display:flex;gap:8px;">${tilesHtml}</div>
            </div>`;

        } else if (artStyleF.startsWith('r:style:') || artStyleF.startsWith('p:style:')) {
            const styleLabel = this._getArtStyleDisplayLabel ? this._getArtStyleDisplayLabel(artStyleF) : null;
            if (!styleLabel) return '';

            let styleHint = null;
            if (artStyleF.startsWith('r:style:')) {
                const parts = artStyleF.slice(8).split(':');
                styleHint = this._AS_REGION_DATA?.find(r => r.area === parts[0])
                    ?.styles.find(s => s.tier === parts[1] && s.name === parts.slice(2).join(':'))?.hint || null;
            } else {
                const rest = artStyleF.slice(8);
                const sep = rest.indexOf(':');
                styleHint = this._AS_PHIL_DATA?.find(g => g.group === rest.slice(0, sep))
                    ?.styles.find(s => s.name === rest.slice(sep + 1))?.hint || null;
            }

            const thumbHtml = this._styleThumbHtml(styleLabel);

            return `<div style="margin-bottom:16px;border-radius:10px;overflow:hidden;position:relative;width:100%;height:180px;background:#1a1a2e;box-shadow:0 4px 20px rgba(0,0,0,0.18);">
                ${thumbHtml}
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.88) 100%);pointer-events:none;"></div>
                <div style="position:absolute;bottom:0;left:0;right:0;padding:24px 20px 18px;color:#fff;pointer-events:none;">
                    <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:8px;font-weight:600;">✦ Art Style</div>
                    <div style="font-size:24px;font-weight:800;letter-spacing:-.01em;margin-bottom:5px;text-shadow:0 2px 10px rgba(0,0,0,.6);">${this.escape(styleLabel)}</div>
                    ${styleHint ? `<div style="font-size:12px;color:#bbb;font-style:italic;text-shadow:0 1px 4px rgba(0,0,0,.5);">${this.escape(styleHint)}</div>` : ''}
                </div>
                <div style="position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:8px;">
                    <button onclick="App.openArtStyleSlideshowFromFilter()" style="background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.28);border-radius:20px;padding:5px 14px;font-size:10px;color:#fff;font-weight:700;letter-spacing:.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:background .15s;" onmouseenter="this.style.background='rgba(255,255,255,0.3)'" onmouseleave="this.style.background='rgba(255,255,255,0.15)'"><i class="fas fa-images" style="font-size:9px;"></i> SLIDESHOW</button>
                    <span style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.22);border-radius:20px;padding:5px 14px;font-size:10px;color:#fff;font-weight:700;letter-spacing:.6px;">STYLE FILTER ACTIVE</span>
                </div>
            </div>`;

        } else if (artStyleF.startsWith('p:group:')) {
            const groupName = artStyleF.slice(8);
            const groupData = this._AS_PHIL_DATA?.find(g => g.group === groupName);
            const tilesHtml = (groupData?.styles || []).map(s => {
                const clickVal = `p:style:${groupName}:${s.name}`;
                return `<div onclick="App._onArtStyleClick('${this._esc(clickVal)}')"
                         style="width:calc(25% - 5px);min-width:110px;border-radius:6px;overflow:hidden;position:relative;height:90px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;background:#1a1a2e;"
                         onmouseenter="this.style.borderColor='#0078d4'" onmouseleave="this.style.borderColor='transparent'">
                        ${this._styleThumbHtml(s.name)}
                        <div style="position:absolute;bottom:0;left:0;right:0;padding:5px 6px 4px;background:linear-gradient(transparent,rgba(0,0,0,0.75));pointer-events:none;">
                            <div style="font-size:10px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.name)}</div>
                            <div style="font-size:9px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(s.hint || '')}</div>
                        </div>
                    </div>`;
            }).join('');
            if (!tilesHtml) return '';
            return `<div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="${groupData?.icon || 'fas fa-layer-group'}" style="color:${groupData?.color || '#888'};font-size:13px;"></i>
                    <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${this.escape(groupName)}</span>
                    <span style="font-size:11px;color:#aaa;">${groupData?.styles.length || 0} styles</span>
                    <button onclick="App.openArtStyleSlideshowFromFilter()" style="margin-left:auto;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-images" style="font-size:10px;"></i> Slideshow</button>
<button onclick="App.generateVideoFromFilter()" style="margin-left:10px;background:transparent;border:1px solid rgba(0,120,212,.35);color:#0078d4;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s;" onmouseenter="this.style.background='#e7f3ff';this.style.borderColor='#0078d4'" onmouseleave="this.style.background='transparent';this.style.borderColor='rgba(0,120,212,.35)'"><i class="fas fa-video" style="font-size:10px;"></i> Generate Video</button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">${tilesHtml}</div>
            </div>`;
        }
        return '';
    },
generateVideoFromFilter() {
        const artStyle = this.state.calendar?.videoTagsFilter?.artStyle;
        if (!artStyle) {
            alert('Please select an art style first.');
            return;
        }

        const styleLabel = this._getArtStyleDisplayLabel ? this._getArtStyleDisplayLabel(artStyle) : null;
        if (!styleLabel) {
            alert('Could not determine the art style label.');
            return;
        }

        // Show a confirmation dialog
        if (!confirm(`Generate a video for the art style: "${styleLabel}"?`)) {
            return;
        }

        // Make a request to the server to trigger the video generation
        fetch('/api/generate-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ artStyle: styleLabel }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Video generation started successfully. You will be notified when it is complete.');
            } else {
                alert(`Error starting video generation: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error starting video generation:', error);
            alert('An unexpected error occurred while starting the video generation.');
        });
    },

    // =========================================================================
    // UTILITY
    // =========================================================================

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
};


if (typeof App !== 'undefined') {
    Object.assign(App, CalendarArtStyleFilter);
    App.__htpCache = null;
    App._artStyleImageCache = null;

    // Invalidate image cache whenever new events load
    const _origLoadLatestEvents = App.loadLatestEvents;
    if (typeof _origLoadLatestEvents === 'function') {
        App.loadLatestEvents = async function (...args) {
            const result = await _origLoadLatestEvents.apply(this, args);
            this._artStyleImageCache = null; // force rebuild
            this.__htpCache = null;
            return result;
        };
    }
}