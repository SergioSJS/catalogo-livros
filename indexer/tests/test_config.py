"""Testes para config.py."""
import os
import pytest
from src.config import load_config, AppConfig


def test_load_valid_config(config_test_yaml, tmp_path):
    cfg = load_config(config_test_yaml)
    assert isinstance(cfg, AppConfig)
    assert len(cfg.sources) == 2
    assert cfg.sources[0].language == "en"


def test_config_defaults(config_test_yaml):
    cfg = load_config(config_test_yaml)
    assert cfg.thumbnail.width == 300
    assert cfg.thumbnail.format == "webp"
    assert cfg.indexing.min_file_size == 1


def test_config_extra_tags(config_test_yaml):
    cfg = load_config(config_test_yaml)
    pt_source = next(s for s in cfg.sources if s.language == "pt")
    assert "test-pt" in pt_source.extra_tags


def test_config_llm_disabled(config_test_yaml):
    cfg = load_config(config_test_yaml)
    assert cfg.llm.enabled is False


def test_config_env_override(config_test_yaml, monkeypatch, tmp_path):
    new_path = str(tmp_path / "custom_db.db")
    monkeypatch.setenv("DATABASE_PATH", new_path)
    cfg = load_config(config_test_yaml)
    assert cfg.database_path == new_path


def test_config_invalid_yaml(tmp_path):
    bad = tmp_path / "bad.yaml"
    bad.write_text("sources: not_a_list\n")
    with pytest.raises(Exception):
        load_config(bad)
