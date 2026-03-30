import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchUsersByUsername, toApiAssetUrl, toDisplayName, type ApiMentionableUser } from '../../lib/api';

type MentionState = {
  query: string;
  start: number;
  end: number;
};

type PostComposerInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
};

function getMentionState(value: string, caretPosition: number): MentionState | null {
  const beforeCaret = value.slice(0, caretPosition);
  const match = beforeCaret.match(/(^|\s)@([a-zA-Z0-9_]*)$/);

  if (!match) {
    return null;
  }

  const query = match[2] || '';
  const start = caretPosition - query.length - 1;

  if (start < 0) {
    return null;
  }

  return {
    query,
    start,
    end: caretPosition,
  };
}

export const PostComposerInput = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = '',
  disabled = false,
  autoFocus = false,
  onSubmit,
}: PostComposerInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [suggestions, setSuggestions] = useState<ApiMentionableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const shouldShowSuggestions = useMemo(
    () => Boolean(mentionState) && suggestions.length > 0,
    [mentionState, suggestions.length],
  );

  useEffect(() => {
    if (!mentionState) {
      setSuggestions([]);
      setIsLoading(false);
      setActiveIndex(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await searchUsersByUsername(mentionState.query, 6);
        if (!cancelled) {
          setSuggestions(result.filter((user) => Boolean(user.username?.trim())));
          setActiveIndex(0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load mention suggestions:', error);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mentionState]);

  const updateMentionState = (nextValue: string, caretPosition: number) => {
    setMentionState(getMentionState(nextValue, caretPosition));
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    updateMentionState(nextValue, event.target.selectionStart ?? nextValue.length);
  };

  const selectSuggestion = (user: ApiMentionableUser) => {
    const normalizedUsername = user.username?.trim().toLowerCase();

    if (!mentionState || !normalizedUsername) {
      return;
    }

    const nextValue = `${value.slice(0, mentionState.start)}@${normalizedUsername} ${value.slice(mentionState.end)}`;
    onChange(nextValue);
    setMentionState(null);
    setSuggestions([]);

    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const nextCaret = mentionState.start + normalizedUsername.length + 2;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldShowSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % suggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
        return;
      }

      if ((event.key === 'Enter' || event.key === 'Tab') && suggestions[activeIndex]) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }

      if (event.key === 'Escape') {
        setMentionState(null);
        setSuggestions([]);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full min-w-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(event) => updateMentionState(value, event.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(event) => updateMentionState(value, event.currentTarget.selectionStart ?? value.length)}
        onBlur={() => window.setTimeout(() => setMentionState(null), 120)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        autoFocus={autoFocus}
        className={className}
      />
      {(shouldShowSuggestions || (mentionState && isLoading)) ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[15px] border border-border bg-surface shadow-xl">
          {isLoading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-xs font-bold text-muted">Searching users...</div>
          ) : (
            suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(user)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${index === activeIndex ? 'bg-ink/5' : 'bg-surface'} hover:bg-ink/5`}
              >
                <div className="h-9 w-9 overflow-hidden rounded-[10px] bg-ink/10 shrink-0">
                  {user.avatar ? <img src={toApiAssetUrl(user.avatar)} alt={toDisplayName(user)} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{toDisplayName(user)}</div>
                  <div className="truncate text-xs font-bold text-muted">@{user.username?.toLowerCase()}</div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
