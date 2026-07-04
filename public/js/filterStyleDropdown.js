
    filterStyleDropdown(inputEl, selectId) {
        const filter = inputEl.value.toLowerCase();
        const select = document.getElementById(selectId);
        if (!select) return;

        for (const optgroup of select.getElementsByTagName('optgroup')) {
            let hasVisibleOptions = false;
            for (const option of optgroup.getElementsByTagName('option')) {
                const txtValue = option.textContent || option.innerText;
                if (txtValue.toLowerCase().indexOf(filter) > -1) {
                    option.style.display = "";
                    hasVisibleOptions = true;
                } else {
                    option.style.display = "none";
                }
            }
            // Also check the optgroup label
            const groupLabel = optgroup.label;
             if (groupLabel.toLowerCase().indexOf(filter) > -1) {
                for (const option of optgroup.getElementsByTagName('option')) {
                    option.style.display = "";
                }
                hasVisibleOptions = true;
            }

            if (hasVisibleOptions) {
                optgroup.style.display = "";
            } else {
                optgroup.style.display = "none";
            }
        }
    },

