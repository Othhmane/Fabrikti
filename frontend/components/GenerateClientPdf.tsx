// GenerateClientPdf.tsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer, X } from 'lucide-react';

interface Client {
  name: string;
  email: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalInvoiced: number;
  balance: number;
  registrationDate?: string;
  lastOrderDate?: string;
}

interface TimelineItem {
  _type: string;
  id: string;
  orderDate?: string;
  date?: string;
  type?: string;
  amount?: number;
  totalPrice?: number;
  status?: string;
  description?: string;
  items?: any[];
}

interface Props {
  client: Client;
  timeline: TimelineItem[];
}

const GenerateClientPdf: React.FC<Props> = ({ client, timeline }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generatePdfBlob = () => {
    const doc = new jsPDF();
    
    // Configuration du document
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête avec logo (simulé)
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('FABRIKTI', 14, 17);
    
    // Informations de l'entreprise
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(' Fabrication de semelles et daccessoires pour chaussures ', 14, 30);
    doc.text('Cheraga, 16000 Alger', 14, 35);
    doc.text('Tel: +213 550 80 57 80| Email: tchouna@fabrikti.dz', 14, 40);
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 45, pageWidth - 14, 45);
    
    // Titre du document
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FICHE CLIENT', pageWidth / 2, 55, { align: 'center' });
    
    // Date du document
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 55, { align: 'right' });
    
    // Informations client
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('INFORMATIONS CLIENT', 14, 70);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Nom: ${client.name}`, 14, 80);
    doc.text(`Email: ${client.email || 'Non renseigné'}`, 14, 87);
    doc.text(`Téléphone: ${client.phone || 'Non renseigné'}`, 14, 94);
    doc.text(`Adresse: ${client.address || 'Non renseignée'}`, 14, 101);
    
    if (client.registrationDate) {
      doc.text(`Client depuis: ${new Date(client.registrationDate).toLocaleDateString('fr-FR')}`, 14, 108);
    }
    
    // Statistiques
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES', pageWidth - 14, 70, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Commandes: ${client.ordersCount}`, pageWidth - 14, 80, { align: 'right' });
    doc.text(`Total facturé: ${client.totalInvoiced.toLocaleString()} DA`, pageWidth - 30, 87, { align: 'right' });
    doc.text(`Dernière commande: ${client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString('fr-FR') : 'N/A'}`, pageWidth - 14, 94, { align: 'right' });
    
    const soldeText = client.balance > 0 
      ? `Crédit: +${client.balance.toLocaleString()} DA` 
      : client.balance < 0 
        ? `Dette: ${client.balance.toLocaleString()} DA` 
        : 'Solde nul';
    
    // Correction de la couleur selon le solde
    if (client.balance < 0) {
      doc.setTextColor(220, 38, 38); // Rouge pour la dette
    } else if (client.balance > 0) {
      doc.setTextColor(5, 150, 105); // Vert pour le crédit
    } else {
      doc.setTextColor(0, 0, 0); // Noir pour solde nul
    }
    
    doc.text(soldeText, pageWidth - 20, 101, { align: 'right'});
    doc.setTextColor(0, 0, 0); // Réinitialisation à noir
    
    // Ligne de séparation
    doc.setLineWidth(0.5);
    doc.line(14, 115, pageWidth - 14, 115);
    
    // Historique filtré
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`HISTORIQUE DES ACTIVITÉS (${timeline.length} éléments)`, 14, 125);
    
    // Préparer les données pour le tableau
    const tableData = timeline.map(item => {
      const isOrder = item._type === 'ORDER';
      const date = new Date(item.orderDate || item.date || '').toLocaleDateString('fr-FR');
      const reference = isOrder ? `CMD-${item.id.slice(0,5).toUpperCase()}` : `TRX-${item.id.slice(0,5).toUpperCase()}`;
      const montant = isOrder ? item.totalPrice : item.amount;
      const statut = isOrder 
        ? (item.status === 'completed' ? 'Livrée' : item.status === 'pending' ? 'En cours' : item.status === 'cancelled' ? 'Annulée' : item.status)
        : (item.type === 'income' ? 'Encaissement' : 'Décaissement');
      
      return [
        date,
        reference,
        `${montant?.toLocaleString() || 0} DA`,
        statut
      ];
    });

    // Ajouter le tableau
    autoTable(doc, {
      startY: 130,
      head: [['Date', 'Référence', 'Montant', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 14, right: 14 }
    });

    // Pied de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} sur ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Document généré par Fabrikti - Solution pour artisans chaussuriers',
        14,
        pageHeight - 10
      );
    }

    return doc.output('blob');
  };

  const handlePreview = () => {
    const blob = generatePdfBlob();
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setShowPreview(false);
    setPdfUrl(null);
  };

  const handleDownload = () => {
    const blob = generatePdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiche_client_${client.name.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (showPreview) {
      handleClosePreview();
    }
  };

// ... (reste du code identique au-dessus)

  return (
    <>
      <button
        onClick={handlePreview}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-indigo-700 transition-all"
      >
        <Printer size={14} />
        Exporter PDF
      </button>

      {showPreview && pdfUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 md:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-6xl flex flex-col overflow-hidden">
            
            {/* Barre d'outils du Modal */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Aperçu du document
                </h3>
                <p className="text-xs text-gray-500">{client.name} - Fiche Client</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95"
                >
                  <Printer size={16} />
                  Télécharger le PDF
                </button>
                
                <div className="w-px h-8 bg-gray-200 mx-1" />
                
                <button
                  onClick={handleClosePreview}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Zone d'affichage du PDF - Agrandie */}
            <div className="flex-1 bg-gray-100 p-2 md:p-4 overflow-hidden">
              <div className="w-full h-full bg-white rounded shadow-inner overflow-hidden">
                <iframe
                  src={`${pdfUrl}#view=FitH`} 
                  className="w-full h-full border-none"
                  title="Aperçu PDF"
                />
              </div>
            </div>
            
            {/* Pied de page du Modal (Optionnel) */}
            <div className="p-3 border-t bg-gray-50 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                Système de gestion Fabrikti - Document Officiel
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GenerateClientPdf;
