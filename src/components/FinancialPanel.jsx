import React from 'react';
import { calculateMoneyLines } from '../models/financialGuardrails.js';
import { getCopy } from '../models/terminology.js';

function NumberField({ label, hint, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint && <small className="field-hint muted">{hint}</small>}
    </label>
  );
}

/**
 * The money panel. Which number gets the big type depends on who is
 * paying the user's rent: someone still employed is working toward
 * being able to quit, someone who already quit is watching survival.
 */
export default function FinancialPanel({
  mode,
  financial,
  employment,
  targetMonthlyIncome,
  onChange,
}) {
  const { businessFixedCost = 0, livingCost = 0, unitPrice, unitCost } = financial;
  const lines = calculateMoneyLines({
    businessFixedCost,
    livingCost,
    unitPrice,
    unitCost,
    employment,
    targetMonthlyIncome,
  });

  const setField = (key) => (value) => onChange({ ...financial, [key]: value });
  const leading = lines.leadingLine === 'survival';

  return (
    <section className="card">
      <h2>{getCopy(leading ? 'survivalLine' : 'replacementLine', mode)}</h2>

      {financial.costsSplitPending && (
        <p className="notice">
          我們把「固定成本」拆成<strong>事業支出</strong>和<strong>個人生活費</strong>兩格了。
          你舊的數字先全部放在生活費，請確認一下拆得對不對——在職期間生活費由薪水支付，
          不會再算進生死線。
        </p>
      )}

      <div className="field-grid">
        <NumberField
          label={getCopy('businessFixedCost', mode)}
          hint="工具、訂閱、店租等只屬於事業的月固定支出"
          value={businessFixedCost}
          onChange={setField('businessFixedCost')}
        />
        <NumberField
          label={getCopy('livingCost', mode)}
          hint={
            lines.salaryCoversLiving
              ? '在職期間由薪水支付，只用來算離職門檻'
              : '你已離開正職，這筆現在要靠事業賺回來'
          }
          value={livingCost}
          onChange={setField('livingCost')}
        />
        <NumberField
          label={getCopy('unitPrice', mode)}
          value={unitPrice}
          onChange={setField('unitPrice')}
        />
        <NumberField
          label={getCopy('unitCost', mode)}
          value={unitCost}
          onChange={setField('unitCost')}
        />
      </div>

      {lines.viable ? (
        <div className="verdict verdict-ok">
          <p>
            {getCopy('unitMargin', mode)}：<strong>{lines.unitMargin}</strong>
          </p>

          {leading ? (
            <>
              <p className="big-number">
                生死線：每月 <strong>{lines.survivalUnits}</strong> 個單位
              </p>
              <p className="muted">
                含你的生活費 {livingCost} 元——你已經離開正職，這筆要靠事業賺回來。
              </p>
            </>
          ) : (
            <>
              <p className="big-number">
                取代薪水：每月 <strong>{lines.replacementUnits}</strong> 個單位
              </p>
              <p className="muted">
                賣到這個量，事業就付得起你的生活費（{livingCost} 元）＋事業支出（
                {businessFixedCost} 元），可以認真考慮離職。
              </p>
              <p>
                事業本身不賠錢的門檻：每月 <strong>{lines.survivalUnits}</strong> 個單位
                <span className="muted">
                  （只算事業支出 {businessFixedCost} 元；你的生活費現在由薪水付）
                </span>
              </p>
            </>
          )}

          {targetMonthlyIncome > 0 && (
            <p>
              {getCopy('targetLine', mode)}（另外賺 {targetMonthlyIncome} 元）：
              每月 <strong>{lines.targetUnits}</strong> 個單位
            </p>
          )}
        </div>
      ) : (
        <div className="verdict verdict-danger">
          <p>{getCopy('notViable', mode)}</p>
        </div>
      )}
    </section>
  );
}
