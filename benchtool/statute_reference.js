/**
 * Universal Statutory Reference System
 * Provides clickable statutory references across all benchtool tools
 */

class StatuteReference {
    constructor() {
        this.modal = null;
        this.titleEl = null;
        this.textEl = null;
        this.loader = null;
    }

    initModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('statuteModal')) {
            const modalHTML = `
                <div id="statuteModal" class="modal" style="display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); -webkit-overflow-scrolling: touch;">
                    <div class="modal-content" style="background-color: white; margin: 5% auto; padding: 0; border-radius: 12px; width: 95%; max-width: 1100px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                        <div class="modal-header" style="background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0; flex-shrink: 0;">
                            <h2 id="statuteModalTitle" style="font-size: 1.5rem; margin: 0;">Statute Text</h2>
                            <button onclick="statuteReference.closeModal()" class="close-btn" style="background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;">✕</button>
                        </div>
                        <div class="modal-body" id="statuteModalBody" style="padding: 20px 30px; overflow-y: auto; flex-grow: 1; font-family: 'Lora', serif; line-height: 1.6;">
                            <div class="statute-loader" id="statuteLoader" style="text-align: center; padding: 50px; font-size: 18px; color: #666;">Loading statute...</div>
                            <div id="statuteText" style="background-color: #f8fafc; padding: 15px; border-radius: 8px; line-height: 1.6; font-size: 1.05rem; text-align: left; hyphens: auto;"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = document.getElementById('statuteModal');
        this.titleEl = document.getElementById('statuteModalTitle');
        this.textEl = document.getElementById('statuteText');
        this.loader = document.getElementById('statuteLoader');

        // Add click outside to close
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });
    }

    async fetchStatute(law, section) {
        this.titleEl.textContent = `Loading ${law.toUpperCase()} § ${section}...`;
        this.textEl.innerHTML = '';
        this.loader.style.display = 'block';
        this.modal.style.display = 'block';

        try {
            // Use the backend proxy to fetch the statute
            const response = await fetch(`/nysenate-proxy?law=${law}&section=${section}`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const data = await response.json();

            if (data.success) {
                this.titleEl.textContent = `${data.result.title}`;
                let rawText = data.result.text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                let formattedHtml = this.formatStatuteText(rawText);
                this.textEl.innerHTML = formattedHtml;
            } else {
                this.textEl.innerHTML = `<p style="color:red;">Error: ${data.message || 'Could not load statute.'}</p>`;
            }
        } catch (error) {
            this.titleEl.textContent = "Error";
            this.textEl.innerHTML = `<p style="color:red;">Failed to fetch statute. Please check your internet connection.</p>`;
            console.error("Fetch error:", error);
        } finally {
            this.loader.style.display = 'none';
        }
    }

    formatStatuteText(rawText) {
        return rawText.split('\n').map(line => {
            line = line.trim();
            if (line.match(/^§\s*\S+/)) return `<p class="section-title-statute" style="font-size: 1.35rem; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: #1e293b; text-align: left;">${line}</p>`;
            if (line.match(/^\d+\./)) return `<p class="paragraph indent-1" style="margin-bottom: 1em; padding-left: 0; margin-left: 1.5em; text-indent: -1.5em;">${line}</p>`;
            if (line.match(/^\([a-z]\)/)) return `<p class="paragraph indent-2" style="margin-bottom: 1em; padding-left: 0; margin-left: 3em; text-indent: -1.5em;">${line}</p>`;
            return `<p class="text-block" style="margin-bottom: 1em; text-align: left;">${line}</p>`;
        }).join('');
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    showTooltip(html, x, y) {
        const tooltip = document.getElementById('statuteTooltip');
        tooltip.innerHTML = html;
        tooltip.style.left = x + 12 + 'px';
        tooltip.style.top = y + 12 + 'px';
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        const tooltip = document.getElementById('statuteTooltip');
        tooltip.style.display = 'none';
    }

    async fetchStatutePreview(law, section) {
        try {
            const response = await fetch(`/nysenate-proxy?law=${law}&section=${section}`);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            if (data.success) {
                let rawText = data.result.text.replace(/\n/g, '\n').replace(/\"/g, '"');
                let lines = rawText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 5);
                return `<strong>${data.result.title}</strong><br>` + lines.map(l => `<div>${l}</div>`).join('');
            } else {
                return '<em>Preview unavailable</em>';
            }
        } catch {
            return '<em>Preview unavailable</em>';
        }
    }

    // Enhance makeCitationsClickable to add tooltip preview on hover
    makeCitationsClickable(container = document.body) {
        const citationPatterns = [
            // CPL citations: CPL 710.40, CPL 245.20[3], etc.
            /(CPL\s+\d+\.\d+(?:\[\d+\])?)/gi,
            // PEN citations: PL § 110.00, Penal Law § 70.06, etc.
            /(PL\s+§\s+\d+\.\d+)/gi,
            /(Penal\s+Law\s+§\s+\d+\.\d+)/gi,
            // VTL citations: VTL 1196, etc.
            /(VTL\s+\d+)/gi,
            // General section citations: § 60.45[2][a], etc.
            /(§\s+\d+\.\d+(?:\[\d+\])?(?:\[[a-z]\])?)/gi
        ];

        citationPatterns.forEach(pattern => {
            const matches = container.innerHTML.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const law = this.parseLawFromCitation(match);
                    const section = this.parseSectionFromCitation(match);
                    
                    if (law && section) {
                        const clickableCitation = `<a href="#" class="statute-link" style="font-weight: 700; color: #1e293b !important; text-decoration: none; cursor: pointer;" data-law="${law}" data-section="${section}">${match}</a>`;
                        container.innerHTML = container.innerHTML.replace(match, clickableCitation);
                    }
                });
            }
        });

        // Add hover listeners for previews
        container.querySelectorAll('a.statute-link').forEach(link => {
            link.addEventListener('mouseenter', async (e) => {
                const law = link.getAttribute('data-law');
                const section = link.getAttribute('data-section');
                const html = await this.fetchStatutePreview(law, section);
                this.showTooltip(html, e.clientX, e.clientY);
            });
            link.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('statuteTooltip');
                tooltip.style.left = e.clientX + 12 + 'px';
                tooltip.style.top = e.clientY + 12 + 'px';
            });
            link.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    parseLawFromCitation(citation) {
        citation = citation.toUpperCase();
        if (citation.includes('CPL')) return 'CPL';
        if (citation.includes('PL') || citation.includes('PENAL')) return 'PEN';
        if (citation.includes('VTL')) return 'VTL';
        if (citation.includes('§')) return 'PEN'; // Default to PEN for general section references
        return null;
    }

    parseSectionFromCitation(citation) {
        // Extract section number from various citation formats
        const sectionMatch = citation.match(/(\d+\.\d+)/);
        if (sectionMatch) return sectionMatch[1];
        
        // Handle VTL citations without decimal
        const vtlMatch = citation.match(/VTL\s+(\d+)/i);
        if (vtlMatch) return vtlMatch[1];
        
        return null;
    }

    // Initialize the system
    init() {
        // Make existing citations clickable
        this.makeCitationsClickable();
        
        // Set up observer for dynamically added content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.makeCitationsClickable(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

const statuteReference = new StatuteReference();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Tooltip element for previews (moved inside DOMContentLoaded)
    if (!document.getElementById('statuteTooltip')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'statuteTooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '3000';
        tooltip.style.background = '#fff';
        tooltip.style.border = '1px solid #cbd5e1';
        tooltip.style.borderRadius = '8px';
        tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
        tooltip.style.padding = '12px 18px';
        tooltip.style.fontFamily = "'Lora', serif";
        tooltip.style.fontSize = '1rem';
        tooltip.style.color = '#1e293b';
        tooltip.style.display = 'none';
        tooltip.style.maxWidth = '420px';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }

    statuteReference.initModal();
    statuteReference.init();
});

// Export for use in other scripts
window.statuteReference = statuteReference; 