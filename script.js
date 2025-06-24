// ===================================================================================
// DOM Elementlerini Seçme
// ===================================================================================
const transactionForm = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const newCategoryInput = document.getElementById('new-category');
const categoryWrapper = document.getElementById('category-wrapper');
const transactionList = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');
const exportBtn = document.getElementById('export-csv');
const importInput = document.getElementById('import-csv');
const expenseChartCanvas = document.getElementById('expense-chart').getContext('2d');

// ===================================================================================
// Uygulama Durumu (State)
// ===================================================================================
// Tarayıcı hafızasından (localStorage) verileri al veya boş bir dizi ile başla
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChart; // Grafik değişkeni

// ===================================================================================
// Fonksiyonlar
// ===================================================================================

/**
 * Benzersiz bir ID üretir.
 * @returns {string} - Benzersiz ID
 */
function generateID() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * İşlemleri tarayıcı hafızasına kaydeder.
 */
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

/**
 * Yeni bir işlemi listeye, DOM'a ve hafızaya ekler.
 * @param {Event} e - Form gönderme olayı
 */
function addTransaction(e) {
    e.preventDefault(); // Formun varsayılan gönderme davranışını engelle

    // Form doğrulama
    if (descriptionInput.value.trim() === '' || amountInput.value.trim() === '' || dateInput.value.trim() === '') {
        alert('Lütfen tüm alanları doldurun.');
        return;
    }

    let categoryValue = categoryInput.value;
    // Eğer 'Diğer' seçilip yeni kategori girildiyse
    if (categoryValue === 'Diğer' && newCategoryInput.value.trim() !== '') {
        categoryValue = newCategoryInput.value.trim();
        // Yeni kategoriyi kalıcı olarak listeye ekle
        if (![...categoryInput.options].some(option => option.value === categoryValue)) {
            const newOption = new Option(categoryValue, categoryValue);
            categoryInput.add(newOption, categoryInput.options[categoryInput.options.length - 1]);
        }
    }

    // Yeni işlem nesnesi oluştur
    const transaction = {
        id: generateID(),
        description: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
        type: typeInput.value,
        category: typeInput.value === 'expense' ? categoryValue : 'Gelir'
    };

    // İşlemi ana listeye ekle
    transactions.push(transaction);

    // Hafızaya kaydet
    saveTransactions();

    // Arayüzü güncelle
    updateDOM();

    // Formu temizle
    transactionForm.reset();
    newCategoryInput.style.display = 'none'; // Yeni kategori alanını gizle
}

/**
 * Bir işlemi ID'sine göre siler.
 * @param {string} id - Silinecek işlemin ID'si
 */
function deleteTransaction(id) {
    // ID'si eşleşmeyenleri tutarak listeyi güncelle
    transactions = transactions.filter(transaction => transaction.id !== id);
    
    // Hafızayı güncelle
    saveTransactions();
    
    // Arayüzü yenile
    updateDOM();
}


/**
 * Arayüzü (tablo, toplamlar, grafik) günceller.
 */
function updateDOM() {
    transactionList.innerHTML = ''; // Listeyi temizle

    // Her bir işlem için tabloya yeni bir satır ekle
    transactions.forEach(transaction => {
        const item = document.createElement('tr');
        const sign = transaction.type === 'income' ? '+' : '-';
        
        item.innerHTML = `
            <td data-label="Açıklama">${transaction.description}</td>
            <td data-label="Miktar" class="${transaction.type}">${sign}₺${Math.abs(transaction.amount).toFixed(2)}</td>
            <td data-label="Tarih">${transaction.date}</td>
            <td data-label="Tip">${transaction.type === 'income' ? 'Gelir' : 'Gider'}</td>
            <td data-label="Kategori">${transaction.category}</td>
            <td data-label="İşlem"><button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">Sil</button></td>
        `;
        transactionList.appendChild(item);
    });

    updateTotals();
    updateChart();
}


/**
 * Toplam gelir, gider ve net bakiyeyi hesaplayıp gösterir.
 */
function updateTotals() {
    const amounts = transactions.map(t => t.amount);
    
    const totalIncome = amounts
        .filter((_, i) => transactions[i].type === 'income')
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const totalExpense = amounts
        .filter((_, i) => transactions[i].type === 'expense')
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const netBalance = (totalIncome - totalExpense).toFixed(2);

    totalIncomeEl.innerText = `₺${totalIncome}`;
    totalExpenseEl.innerText = `₺${totalExpense}`;
    netBalanceEl.innerText = `₺${netBalance}`;
}

/**
 * Gider kategorilerine göre pasta grafiği günceller.
 */
function updateChart() {
    const expenseCategories = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
            acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
            return acc;
        }, {});

    const labels = Object.keys(expenseCategories);
    const data = Object.values(expenseCategories);

    if (expenseChart) {
        expenseChart.destroy(); // Önceki grafiği temizle
    }

    expenseChart = new Chart(expenseChartCanvas, {
        type: 'doughnut', // Grafik tipi: doughnut, pie, bar
        data: {
            labels: labels,
            datasets: [{
                label: 'Giderler',
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}


/**
 * Verileri CSV formatında dışa aktarır.
 */
function exportToCSV() {
    if (transactions.length === 0) {
        alert("Dışa aktarılacak veri bulunmamaktadır.");
        return;
    }
    const csv = Papa.unparse(transactions); // PapaParse ile CSV oluştur
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "gelir-gider-raporu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * CSV dosyasından veri içe aktarır.
 * @param {Event} event - Dosya seçme olayı
 */
function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        return; // Dosya seçilmediyse bir şey yapma
    }

    // PapaParse kullanarak CSV dosyasını işle
    Papa.parse(file, {
        header: true, // İlk satırı başlık olarak kabul et
        skipEmptyLines: true, // Boş satırları atla
        complete: function(results) {
            // Ayrıştırma sırasında hata varsa göster
            if (results.errors.length) {
                console.error("CSV okuma hatası:", results.errors);
                alert("CSV dosyası okunurken bir hata oluştu. Lütfen dosya formatını kontrol edin.");
                return;
            }

            // Gelen veriyi işle
            const importedData = results.data;
            let newTransactions = 0;

            importedData.forEach(row => {
                // Gerekli alanların varlığını ve geçerliliğini kontrol et
                if (row.id && row.description && !isNaN(parseFloat(row.amount)) && row.date && row.type) {
                    // Eğer bu ID'ye sahip bir işlem zaten yoksa listeye ekle
                    const isDuplicate = transactions.some(t => t.id === row.id);
                    if (!isDuplicate) {
                        const transaction = {
                            id: row.id,
                            description: row.description,
                            amount: parseFloat(row.amount),
                            date: row.date,
                            type: row.type,
                            category: row.category || (row.type === 'expense' ? 'Diğer' : 'Gelir')
                        };
                        transactions.push(transaction);
                        newTransactions++;
                    }
                }
            });
            
            if (newTransactions > 0) {
                saveTransactions(); // Verileri hafızaya kaydet
                updateDOM();        // Arayüzü güncelle
                alert(`${newTransactions} yeni işlem başarıyla içe aktarıldı!`);
            } else {
                alert("İçe aktarılacak yeni bir işlem bulunamadı veya dosyadaki veriler geçersiz.");
            }
        },
        error: function(error) {
            console.error("Dosya okunurken hata:", error);
            alert(`Bir hata oluştu: ${error.message}`);
        }
    });

    // Aynı dosyayı tekrar seçebilmek için input'un değerini sıfırla
    event.target.value = '';
}

// ===================================================================================
// Olay Dinleyicileri (Event Listeners)
// ===================================================================================
function init() {
    // Form gönderildiğinde
    transactionForm.addEventListener('submit', addTransaction);

    // Kategori seçimi değiştiğinde
    categoryInput.addEventListener('change', () => {
        if (categoryInput.value === 'Diğer') {
            newCategoryInput.style.display = 'block';
        } else {
            newCategoryInput.style.display = 'none';
        }
    });

    // İşlem tipi (gelir/gider) değiştiğinde kategori alanını yönet
    typeInput.addEventListener('change', () => {
        categoryWrapper.style.display = typeInput.value === 'expense' ? 'block' : 'none';
    });

    // CSV Dışa Aktar butonu
    exportBtn.addEventListener('click', exportToCSV);

    // CSV İçe Aktar butonu
    importInput.addEventListener('change', importFromCSV);
    
    // Sayfa ilk yüklendiğinde arayüzü doldur
    updateDOM();

    // Başlangıçta gider seçili ise kategori göster
     if(typeInput.value === 'expense') {
        categoryWrapper.style.display = 'block';
    } else {
        categoryWrapper.style.display = 'none';
    }
}

// Uygulamayı başlat
init();
