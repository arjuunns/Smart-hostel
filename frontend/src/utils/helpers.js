export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getStatusBadgeClass = (status) => {
    if (!status) return 'badge-pending';
    return `badge-${status.toLowerCase().replace('_', '')}`;
};

export const getRiskBadgeClass = (riskCategory) => {
    const categoryLower = riskCategory?.toLowerCase() || 'low';
    return `badge-risk-${categoryLower}`;
};

export const getRiskColor = (riskScore) => {
    if (riskScore <= 30) return '#10b981'; // Green
    if (riskScore <= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
};

export const getRiskLabel = (riskScore) => {
    if (riskScore <= 20) return { text: 'Excellent', class: 'low' };
    if (riskScore <= 40) return { text: 'Good', class: 'low' };
    if (riskScore <= 60) return { text: 'Moderate', class: 'medium' };
    if (riskScore <= 80) return { text: 'High Risk', class: 'high' };
    return { text: 'Very High Risk', class: 'high' };
};

export const getApprovalLikelihood = (riskScore) => {
    if (riskScore <= 20) return { text: 'Very Likely', percent: '95%', class: 'high' };
    if (riskScore <= 40) return { text: 'Likely', percent: '80%', class: 'high' };
    if (riskScore <= 60) return { text: 'Moderate', percent: '60%', class: 'medium' };
    if (riskScore <= 80) return { text: 'Unlikely', percent: '30%', class: 'low' };
    return { text: 'Very Unlikely', percent: '10%', class: 'low' };
};

export const generateQRUrl = (data) => {
    const qrData = encodeURIComponent(JSON.stringify(data));
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
};
